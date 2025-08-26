import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Button,
  IconButton,
  Collapse,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  People as PeopleIcon,
  AccountBalance as BalanceIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Pets as AnimalIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ShoppingCart as ShoppingCartIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  MoneyOff as MoneyOffIcon,
  LocalFlorist as PlantIcon,
  Build as ToolIcon,
  // Generic fallbacks
  Circle as GenericIcon
} from '@mui/material-icons';

const MetricCard = ({ title, value, icon, color = 'primary', loading = false, subtitle, trend }) => (
  <Card 
    elevation={3}
    component="article"
    role="img"
    aria-label={`${title}: ${value}`}
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
      {trend && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          backgroundColor: trend.type === 'up' ? 'success.light' : 
                          trend.type === 'down' ? 'error.light' : 'info.light',
          color: trend.type === 'up' ? 'success.contrastText' : 
                 trend.type === 'down' ? 'error.contrastText' : 'info.contrastText',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          {trend.type === 'up' ? '↗' : trend.type === 'down' ? '↘' : '→'} {trend.value}
        </Box>
      )}
    </CardContent>
  </Card>
);

// Function to get appropriate icon based on transaction type and item details
const getActivityIcon = (transaction) => {
  const isDeposit = transaction.tipo === 'adicionar' || transaction.tipo === 'deposito';
  const color = isDeposit ? 'success' : 'error';
  
  // Financial transactions
  if (transaction.categoria === 'financeiro') {
    if (transaction.tipo === 'deposito') {
      // Animal delivery gets special pet paw icon
      if (transaction.descricao?.includes('animais') || transaction.descricao?.includes('matadouro')) {
        return <AnimalIcon color="success" />;
      }
      // Regular money deposit
      return <MoneyIcon color="success" />;
    } else if (transaction.tipo === 'saque') {
      return <MoneyOffIcon color="error" />;
    }
  }

  // Inventory transactions - check item category or name
  if (transaction.categoria === 'inventario') {
    const itemName = transaction.item?.toLowerCase() || transaction.descricao?.toLowerCase() || '';
    
    // SPECIFIC ANIMALS - Individual emoji icons
    // Chickens
    if (itemName.includes('galo') || itemName.includes('chicken_male')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐓</span>; // Rooster
    }
    if (itemName.includes('galinha') || itemName.includes('chicken_female')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐔</span>; // Hen
    }
    
    // Cows
    if (itemName.includes('touro') || itemName.includes('cow_male')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐂</span>; // Bull
    }
    if (itemName.includes('vaca') || itemName.includes('cow_female')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐄</span>; // Cow
    }
    
    // Pigs
    if (itemName.includes('porco') || itemName.includes('pig_male') ||
        itemName.includes('porca') || itemName.includes('pig_female')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐷</span>; // Pig
    }
    
    // Sheep
    if (itemName.includes('ovelha') || itemName.includes('sheep')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐑</span>; // Sheep
    }
    
    // Donkeys/Mules
    if (itemName.includes('burro') || itemName.includes('donkey_male')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🫏</span>; // Donkey
    }
    if (itemName.includes('mula') || itemName.includes('donkey_female')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🐴</span>; // Mule/Horse
    }

    // SPECIFIC PLANTS
    if (itemName.includes('trigo')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🌾</span>; // Wheat
    }
    if (itemName.includes('milho') || itemName.includes('corn')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🌽</span>; // Corn
    }

    // SEEDS
    if (itemName.includes('semente') || itemName.includes('seed')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🌱</span>; // Seed/sprout
    }

    // MATERIALS
    if (itemName.includes('madeira') || itemName.includes('wood')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🪵</span>; // Wood
    }
    
    // BOXES/PRODUCTS
    if (itemName.includes('caixa') || itemName.includes('box')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>📦</span>; // Box
    }

    // RATIONS
    if (itemName.includes('racao') || itemName.includes('portion')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🥣</span>; // Food bowl
    }

    // TOOLS
    if (itemName.includes('balde') || itemName.includes('regador') || 
        itemName.includes('watering')) {
      return <span style={{ fontSize: '20px', color: color === 'success' ? '#4caf50' : '#f44336' }}>🪣</span>; // Bucket
    }

    // GENERIC FALLBACKS
    if (itemName.includes('animal') || itemName.includes('_male') || 
        itemName.includes('_female')) {
      return <AnimalIcon color={color} />;
    }
    
    if (itemName.includes('plant')) {
      return <PlantIcon color={color} />;
    }
    
    if (itemName.includes('tool')) {
      return <ToolIcon color={color} />;
    }
  }

  // Ultimate fallback icons
  return isDeposit ? <AddIcon color="success" /> : <RemoveIcon color="error" />;
};

const FazendaBW = () => {
  const [data, setData] = useState({
    inventory: { totalItems: 0, totalQuantity: 0 },
    users: {},
    balance: { current_balance: 0 },
    analytics: {}
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  
  // UI State
  const [sortOrder, setSortOrder] = useState('newest');
  const [activityLimit, setActivityLimit] = useState(50);
  const [expandedSections, setExpandedSections] = useState({
    itemActivity: true,
    moneyActivity: true
  });

  // Utility function to normalize text display
  const normalizeText = (text) => {
    if (!text) return 'Item';
    
    return text
      .replace(/_/g, ' ')                    // Replace underscores with spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2')   // Add space between camelCase
      .split(' ')                            // Split into words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
      .join(' ');                            // Join back together
  };

  // Global naming system
  const getBestDisplayName = (itemId) => {
    if (!itemId) return 'Item';
    return normalizeText(itemId);
  };

  // Load extension data from browser extension
  const loadExtensionData = useCallback(async () => {
    try {
      // This will be populated by browser extension webhook
      console.log('🔗 Loading data from browser extension...');
      setLoading(false);
    } catch (error) {
      console.error('Error loading extension data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExtensionData();
  }, [loadExtensionData]);

  // Process browser extension data
  useEffect(() => {
    // Listen for extension data via custom events or polling
    const handleExtensionData = (extensionMessages) => {
      console.log('🔗 Processing extension messages:', extensionMessages);
      
      const processedActivities = extensionMessages.map(msg => {
        // Parse Discord message content to extract farm activities
        const content = msg.content || '';
        const author = msg.author || 'Unknown';
        
        let activity = {
          id: msg.id,
          timestamp: msg.timestamp || new Date().toISOString(),
          autor: author,
          content: content
        };

        // Detect activity types from Discord message content
        if (content.includes('INSERIR ITEM') || content.includes('inserir item')) {
          activity.tipo = 'adicionar';
          activity.categoria = 'inventario';
          
          // Extract item and quantity
          const itemMatch = content.match(/Item adicionado:(.+?)\s*x(\d+)/i);
          if (itemMatch) {
            activity.item = itemMatch[1].trim();
            activity.quantidade = parseInt(itemMatch[2]);
          }
        } else if (content.includes('REMOVER ITEM') || content.includes('remover item')) {
          activity.tipo = 'remover';
          activity.categoria = 'inventario';
          
          // Extract item and quantity
          const itemMatch = content.match(/Item removido:(.+?)\s*x(\d+)/i);
          if (itemMatch) {
            activity.item = itemMatch[1].trim();
            activity.quantidade = parseInt(itemMatch[2]);
          }
        } else if (content.includes('CAIXA ORGANIZAÇÃO') && content.includes('DEPÓSITO')) {
          activity.tipo = 'deposito';
          activity.categoria = 'financeiro';
          
          // Extract deposit amount
          const valueMatch = content.match(/Valor depositado:\$?([\d,\.]+)/i);
          if (valueMatch) {
            activity.valor = parseFloat(valueMatch[1].replace(',', '.'));
          }
          
          // Extract description
          const actionMatch = content.match(/Ação:(.+?)(?=Saldo|Data|$)/i);
          if (actionMatch) {
            activity.descricao = actionMatch[1].trim();
          }
        }

        return activity;
      });

      setRecentActivity(processedActivities);
      
      // Update analytics
      setData(prev => ({
        ...prev,
        analytics: {
          ...prev.analytics,
          atividade: {
            transacoes_hoje: processedActivities.length
          }
        }
      }));
    };

    // Set up listener for extension data
    window.addEventListener('extensionData', (event) => {
      handleExtensionData(event.detail);
    });

    return () => {
      window.removeEventListener('extensionData', handleExtensionData);
    };
  }, []);

  const getSortedActivity = () => {
    const sorted = [...recentActivity];
    switch (sortOrder) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      case 'largest':
        return sorted.sort((a, b) => (b.quantidade || 0) - (a.quantidade || 0));
      case 'user':
        return sorted.sort((a, b) => (a.autor || '').localeCompare(b.autor || ''));
      default:
        return sorted;
    }
  };

  // Filter activities by type
  const getItemActivities = () => {
    return getSortedActivity().filter(activity => 
      activity.categoria === 'inventario' || 
      (activity.tipo && ['adicionar', 'remover'].includes(activity.tipo))
    ).slice(0, activityLimit);
  };

  const getMoneyActivities = () => {
    return getSortedActivity().filter(activity => {
      return activity.categoria === 'financeiro' || 
             (activity.tipo && ['deposito', 'saque'].includes(activity.tipo)) ||
             (activity.valor !== undefined && activity.valor !== null);
    }).slice(0, activityLimit);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Erro ao carregar dados: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        🏛️ Fazenda BW - Dashboard
      </Typography>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Atividades Capturadas"
            value={recentActivity.length}
            icon={<InventoryIcon fontSize="large" />}
            color="primary"
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Atividades de Itens"
            value={getItemActivities().length}
            icon={<ShoppingCartIcon fontSize="large" />}
            color="success"
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Atividades Financeiras"
            value={getMoneyActivities().length}
            icon={<MoneyIcon fontSize="large" />}
            color="warning"
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Usuários Ativos"
            value={[...new Set(recentActivity.map(a => a.autor))].length}
            icon={<PeopleIcon fontSize="large" />}
            color="info"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Sort Control */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6">📊 Controles das Atividades:</Typography>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <MenuItem value="newest">⬇️ Mais Recente</MenuItem>
              <MenuItem value="oldest">⬆️ Mais Antigo</MenuItem>
              <MenuItem value="largest">📈 Maior Quantidade</MenuItem>
              <MenuItem value="user">👤 Por Usuário</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={activityLimit}
              onChange={(e) => setActivityLimit(e.target.value)}
            >
              <MenuItem value={25}>25 atividades</MenuItem>
              <MenuItem value={50}>50 atividades</MenuItem>
              <MenuItem value={100}>100 atividades</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Extension Status */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'success.light' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ color: 'success.contrastText' }}>
            🔗 Status da Extensão: {recentActivity.length > 0 ? 'Conectado' : 'Aguardando dados...'}
          </Typography>
          {recentActivity.length > 0 && (
            <Chip 
              label={`${recentActivity.length} mensagens processadas`} 
              color="success" 
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Item Activities */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                📦 Atividades de Itens ({getItemActivities().length})
              </Typography>
              <IconButton onClick={() => toggleSection('itemActivity')}>
                {expandedSections.itemActivity ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            
            <Collapse in={expandedSections.itemActivity}>
              <Box sx={{ height: '600px', overflowY: 'auto' }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                  </Box>
                ) : getItemActivities().length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                    <Typography>Nenhuma atividade de itens capturada</Typography>
                  </Box>
                ) : (
                  <List dense>
                    {getItemActivities().map((transaction, index) => {
                      const icon = getActivityIcon(transaction);
                      
                      return (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemIcon>{icon}</ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {transaction.autor || 'Sistema'}
                                  </Typography>
                                  <Typography variant="body2">
                                    {transaction.tipo === 'adicionar' ? 'adicionou' : 'removeu'}
                                  </Typography>
                                  <Chip 
                                    label={`${transaction.quantidade}x`} 
                                    size="small" 
                                    color={transaction.tipo === 'adicionar' ? 'success' : 'error'}
                                  />
                                  <Typography variant="body2" fontWeight="medium">
                                    {getBestDisplayName(transaction.item)}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                </Typography>
                              }
                            />
                          </ListItem>
                          {index < getItemActivities().length - 1 && <Divider />}
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Box>
            </Collapse>
          </Paper>
        </Grid>

        {/* Money Activities */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                💰 Atividades de Dinheiro ({getMoneyActivities().length})
              </Typography>
              <IconButton onClick={() => toggleSection('moneyActivity')}>
                {expandedSections.moneyActivity ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            
            <Collapse in={expandedSections.moneyActivity}>
              <Box sx={{ height: '600px', overflowY: 'auto' }}>
                {getMoneyActivities().length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                    <Typography variant="body2">Nenhuma atividade financeira capturada</Typography>
                  </Box>
                ) : (
                  <List dense>
                    {getMoneyActivities().map((transaction, index) => {
                      const icon = getActivityIcon(transaction);
                      
                      return (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemIcon>{icon}</ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {transaction.autor || 'Sistema'}
                                  </Typography>
                                  <Chip 
                                    label={`$${(typeof transaction.valor === 'number' ? transaction.valor.toFixed(2) : '0.00')}`}
                                    size="small" 
                                    color={transaction.tipo === 'deposito' ? 'success' : 'error'}
                                  />
                                  <Typography variant="body2">
                                    {transaction.descricao || 'Transação financeira'}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  📅 {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                </Typography>
                              }
                            />
                          </ListItem>
                          {index < getMoneyActivities().length - 1 && <Divider />}
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Box>
            </Collapse>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FazendaBW;