import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TableSortLabel,
  IconButton,
  Collapse,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  People as PeopleIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

const MetricCard = ({ title, value, icon, color = 'primary', loading = false, subtitle }) => (
  <Card 
    elevation={3}
    sx={{ 
      height: '100%',
      background: `linear-gradient(135deg, ${color === 'primary' ? '#1976d2' : 
                                                color === 'secondary' ? '#9c27b0' :
                                                color === 'success' ? '#2e7d32' :
                                                color === 'warning' ? '#ed6c02' : 
                                                color === 'error' ? '#d32f2f' : '#1976d2'}20 0%, transparent 100%)`,
      border: `1px solid ${color === 'primary' ? '#1976d2' : 
                          color === 'secondary' ? '#9c27b0' :
                          color === 'success' ? '#2e7d32' :
                          color === 'warning' ? '#ed6c02' : 
                          color === 'error' ? '#d32f2f' : '#1976d2'}30`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 8px 25px ${color === 'primary' ? '#1976d2' : 
                                  color === 'secondary' ? '#9c27b0' :
                                  color === 'success' ? '#2e7d32' :
                                  color === 'warning' ? '#ed6c02' : 
                                  color === 'error' ? '#d32f2f' : '#1976d2'}40`
      }
    }}
  >
    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="overline" 
            component="h3"
            sx={{ 
              color: 'text.secondary', 
              fontWeight: 600, 
              letterSpacing: '0.5px',
              lineHeight: 1
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="h3" 
            component="div" 
            sx={{ 
              color: `${color}.main`, 
              fontWeight: 700,
              mt: 1,
              lineHeight: 1.2
            }}
          >
            {loading ? <CircularProgress size={32} thickness={4} /> : value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ 
          color: `${color}.main`, 
          opacity: 0.8,
          ml: 2,
          fontSize: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '48px',
          minHeight: '48px'
        }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Trabalhadores = () => {
  const [workers, setWorkers] = useState({});
  const [workerStats, setWorkerStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('nome');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterActivity, setFilterActivity] = useState('all'); // all, active, inactive
  const [expandedWorkers, setExpandedWorkers] = useState(true);
  const [expandedStats, setExpandedStats] = useState(true);

  // Process extension data to create worker statistics
  const processWorkerData = (extensionMessages) => {
    const workerData = {};
    const workerStatsData = {};

    extensionMessages.forEach(msg => {
      const content = msg.content || '';
      const author = msg.author || 'Unknown';
      
      // Initialize worker if not exists
      if (!workerData[author]) {
        workerData[author] = {
          nome: author,
          atividades: [],
          totalTransacoes: 0,
          ultimaAtividade: null,
          funcao: 'trabalhador' // Default role
        };
      }

      // Initialize worker stats if not exists
      if (!workerStatsData[author]) {
        workerStatsData[author] = {
          itensAdicionados: 0,
          itensRemovidos: 0,
          valorDepositado: 0,
          atividades: 0,
          ultimaAtividade: null
        };
      }

      let activity = null;

      // Parse different types of activities
      if (content.includes('INSERIR ITEM') || content.includes('inserir item')) {
        const itemMatch = content.match(/Item adicionado:(.+?)\s*x(\d+)/i);
        if (itemMatch) {
          const quantidade = parseInt(itemMatch[2]);
          activity = {
            tipo: 'adicionar',
            item: itemMatch[1].trim(),
            quantidade: quantidade,
            timestamp: msg.timestamp || new Date().toISOString()
          };
          workerStatsData[author].itensAdicionados += quantidade;
        }
      } else if (content.includes('REMOVER ITEM') || content.includes('remover item')) {
        const itemMatch = content.match(/Item removido:(.+?)\s*x(\d+)/i);
        if (itemMatch) {
          const quantidade = parseInt(itemMatch[2]);
          activity = {
            tipo: 'remover',
            item: itemMatch[1].trim(),
            quantidade: quantidade,
            timestamp: msg.timestamp || new Date().toISOString()
          };
          workerStatsData[author].itensRemovidos += quantidade;
        }
      } else if (content.includes('CAIXA ORGANIZAÇÃO') && content.includes('DEPÓSITO')) {
        const valueMatch = content.match(/Valor depositado:\$?([\d,\.]+)/i);
        if (valueMatch) {
          const valor = parseFloat(valueMatch[1].replace(',', '.'));
          activity = {
            tipo: 'deposito',
            valor: valor,
            timestamp: msg.timestamp || new Date().toISOString()
          };
          workerStatsData[author].valorDepositado += valor;
        }
      }

      if (activity) {
        workerData[author].atividades.push(activity);
        workerData[author].totalTransacoes++;
        workerData[author].ultimaAtividade = activity.timestamp;
        workerStatsData[author].atividades++;
        workerStatsData[author].ultimaAtividade = activity.timestamp;
      }
    });

    return { workerData, workerStatsData };
  };

  // Get filtered and sorted workers
  const getFilteredAndSortedWorkers = () => {
    if (!workers) return [];

    let workersList = Object.values(workers);

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      workersList = workersList.filter(worker => 
        worker.nome.toLowerCase().includes(searchLower)
      );
    }

    // Activity filter
    if (filterActivity !== 'all') {
      const now = new Date();
      const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
      
      if (filterActivity === 'active') {
        workersList = workersList.filter(worker => 
          worker.ultimaAtividade && new Date(worker.ultimaAtividade) > dayAgo
        );
      } else if (filterActivity === 'inactive') {
        workersList = workersList.filter(worker => 
          !worker.ultimaAtividade || new Date(worker.ultimaAtividade) <= dayAgo
        );
      }
    }

    // Sort workers
    workersList.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'atividades':
          aValue = a.totalTransacoes || 0;
          bValue = b.totalTransacoes || 0;
          break;
        case 'ultimaAtividade':
          aValue = new Date(a.ultimaAtividade || 0);
          bValue = new Date(b.ultimaAtividade || 0);
          break;
        case 'nome':
        default:
          aValue = a.nome.toLowerCase();
          bValue = b.nome.toLowerCase();
          break;
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return workersList;
  };

  // Get worker performance color
  const getPerformanceColor = (worker) => {
    const totalActivities = worker.totalTransacoes || 0;
    if (totalActivities >= 20) return 'success';
    if (totalActivities >= 10) return 'warning';
    if (totalActivities > 0) return 'info';
    return 'error';
  };

  // Calculate overall stats
  const calculateOverallStats = () => {
    const workersList = Object.values(workers);
    const totalWorkers = workersList.length;
    const activeWorkers = workersList.filter(w => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return w.ultimaAtividade && new Date(w.ultimaAtividade) > dayAgo;
    }).length;
    const totalTransactions = workersList.reduce((sum, w) => sum + (w.totalTransacoes || 0), 0);
    
    return {
      totalWorkers,
      activeWorkers,
      totalTransactions,
      avgTransactionsPerWorker: totalWorkers > 0 ? (totalTransactions / totalWorkers).toFixed(1) : 0
    };
  };

  useEffect(() => {
    // Initialize with empty data
    setLoading(false);

    // Listen for extension data updates
    const handleExtensionUpdate = (event) => {
      console.log('👥 Processing extension data for workers:', event.detail);
      
      const messages = event.detail || [];
      const { workerData, workerStatsData } = processWorkerData(messages);
      
      setWorkers(workerData);
      setWorkerStats(workerStatsData);
    };

    // Set up listener for extension data
    window.addEventListener('extensionData', handleExtensionUpdate);

    return () => {
      window.removeEventListener('extensionData', handleExtensionUpdate);
    };
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const overallStats = calculateOverallStats();
  const filteredWorkers = getFilteredAndSortedWorkers();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        👥 Trabalhadores - Fazenda BW
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total de Trabalhadores"
            value={overallStats.totalWorkers}
            icon={<PeopleIcon fontSize="large" />}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Trabalhadores Ativos (24h)"
            value={overallStats.activeWorkers}
            icon={<CheckCircleIcon fontSize="large" />}
            color="success"
            subtitle="Últimas 24 horas"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total de Atividades"
            value={overallStats.totalTransactions}
            icon={<AssignmentIcon fontSize="large" />}
            color="info"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Média por Trabalhador"
            value={overallStats.avgTransactionsPerWorker}
            icon={<TrendingUpIcon fontSize="large" />}
            color="warning"
            subtitle="Atividades por pessoa"
          />
        </Grid>
      </Grid>

      {/* Extension Status */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'success.light' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ color: 'success.contrastText' }}>
            🔗 Status: {overallStats.totalWorkers > 0 ? `${overallStats.totalWorkers} trabalhadores identificados` : 'Aguardando dados da extensão...'}
          </Typography>
          {overallStats.totalWorkers > 0 && (
            <Chip 
              label={`${overallStats.totalTransactions} atividades processadas`} 
              color="success" 
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Filters and Search */}
      <Paper elevation={2} sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Pesquisar trabalhadores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Atividade</InputLabel>
            <Select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              label="Atividade"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="active">Ativos (24h)</MenuItem>
              <MenuItem value="inactive">Inativos</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Ordenar por</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Ordenar por"
            >
              <MenuItem value="nome">Nome</MenuItem>
              <MenuItem value="atividades">Atividades</MenuItem>
              <MenuItem value="ultimaAtividade">Última Atividade</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Ordem</InputLabel>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              label="Ordem"
            >
              <MenuItem value="asc">A-Z / Menor</MenuItem>
              <MenuItem value="desc">Z-A / Maior</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Workers Table */}
      <Paper elevation={2}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              👥 Lista de Trabalhadores
            </Typography>
            <Chip 
              label={`${filteredWorkers.length} trabalhadores`} 
              color="primary" 
              size="small" 
            />
          </Box>
          <IconButton
            onClick={() => setExpandedWorkers(!expandedWorkers)}
            sx={{ 
              transform: expandedWorkers ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={expandedWorkers}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'nome'}
                      direction={sortBy === 'nome' ? sortOrder : 'asc'}
                      onClick={() => setSortBy('nome')}
                    >
                      <strong>Nome do Trabalhador</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortBy === 'atividades'}
                      direction={sortBy === 'atividades' ? sortOrder : 'asc'}
                      onClick={() => setSortBy('atividades')}
                    >
                      <strong>Atividades</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <strong>Performance</strong>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'ultimaAtividade'}
                      direction={sortBy === 'ultimaAtividade' ? sortOrder : 'asc'}
                      onClick={() => setSortBy('ultimaAtividade')}
                    >
                      <strong>Última Atividade</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <strong>Estatísticas</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredWorkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="textSecondary" sx={{ py: 4 }}>
                        {searchTerm ? 'Nenhum trabalhador encontrado para a pesquisa' :
                         filterActivity !== 'all' ? `Nenhum trabalhador ${filterActivity === 'active' ? 'ativo' : 'inativo'}` :
                         'Nenhum trabalhador identificado'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkers.map((worker) => {
                    const stats = workerStats[worker.nome] || {};
                    const performanceColor = getPerformanceColor(worker);
                    
                    return (
                      <TableRow key={worker.nome}>
                        <TableCell>
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {worker.nome}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Função: {worker.funcao}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={worker.totalTransacoes || 0}
                            color={performanceColor}
                            size="medium"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {performanceColor === 'success' && <TrendingUpIcon color="success" />}
                            {performanceColor === 'warning' && <TrendingDownIcon color="warning" />}
                            {performanceColor === 'error' && <TrendingDownIcon color="error" />}
                            <Typography variant="body2" color={`${performanceColor}.main`}>
                              {performanceColor === 'success' ? 'Excelente' :
                               performanceColor === 'warning' ? 'Bom' :
                               performanceColor === 'info' ? 'Regular' : 'Inativo'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {worker.ultimaAtividade ? 
                              new Date(worker.ultimaAtividade).toLocaleString('pt-BR') : 
                              'Nunca'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {stats.itensAdicionados > 0 && (
                              <Chip 
                                label={`+${stats.itensAdicionados} itens`} 
                                size="small" 
                                color="success" 
                                variant="outlined"
                              />
                            )}
                            {stats.itensRemovidos > 0 && (
                              <Chip 
                                label={`-${stats.itensRemovidos} itens`} 
                                size="small" 
                                color="error" 
                                variant="outlined"
                              />
                            )}
                            {stats.valorDepositado > 0 && (
                              <Chip 
                                label={`$${stats.valorDepositado.toFixed(2)}`} 
                                size="small" 
                                color="warning" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default Trabalhadores;