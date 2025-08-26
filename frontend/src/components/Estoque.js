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
  CircularProgress,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  IconButton,
  InputAdornment,
  TableSortLabel,
  Switch,
  FormControlLabel,
  Pagination,
  TextField,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

const Estoque = () => {
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Categories for filtering
  const [categories] = useState({
    'plantas': 'Plantas',
    'sementes': 'Sementes', 
    'racoes': 'Rações',
    'comidas': 'Comidas',
    'bebidas': 'Bebidas',
    'animais': 'Animais',
    'materiais': 'Materiais',
    'ferramentas': 'Ferramentas',
    'produtos': 'Produtos',
    'consumeveis': 'Consumíveis',
    'caixas': 'Caixas',
    'outros': 'Outros'
  });
  
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showZeroQuantity, setShowZeroQuantity] = useState(true);
  const [quantityFilter, setQuantityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortColumn, setSortColumn] = useState('nome');

  // Utility function to normalize text display
  const normalizeText = (text) => {
    if (!text) return 'Item';
    
    return text
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Function to categorize items automatically
  const getCategoryForItem = (itemName) => {
    const name = itemName.toLowerCase();
    
    if (name.includes('seed') || name.includes('semente') || name.includes('milho') || name.includes('trigo') || name.includes('junco')) {
      return 'sementes';
    }
    if (name.includes('racao') || name.includes('feed') || name.includes('portion')) {
      return 'racoes';
    }
    if (name.includes('cow') || name.includes('pig') || name.includes('chicken') || name.includes('sheep') || name.includes('donkey') || name.includes('goat') || 
        name.includes('vaca') || name.includes('porco') || name.includes('galinha') || name.includes('ovelha') || name.includes('cabra') || name.includes('burro') ||
        name.includes('_male') || name.includes('_female')) {
      return 'animais';
    }
    if (name.includes('milk') || name.includes('leite') || name.includes('water') || name.includes('agua') || name.includes('juice') || name.includes('suco')) {
      return 'bebidas';
    }
    if (name.includes('bread') || name.includes('pao') || name.includes('food') || name.includes('comida') || name.includes('meal') || name.includes('refeicao')) {
      return 'comidas';
    }
    if (name.includes('hoe') || name.includes('enxada') || name.includes('rastelo') || name.includes('tool') || name.includes('ferramenta') || 
        name.includes('wateringcan') || name.includes('regador') || name.includes('planttrimmer') || name.includes('podador')) {
      return 'ferramentas';
    }
    if (name.includes('caixa') || name.includes('box')) {
      return 'caixas';
    }
    if (name.includes('polvora') || name.includes('gunpowder') || name.includes('produto') || name.includes('product') || name.includes('embalagem') || name.includes('package')) {
      return 'produtos';
    }
    if (name.includes('cigarro') || name.includes('cigarett') || name.includes('tabaco') || name.includes('tobacco') || name.includes('bala') || name.includes('consumivel') || name.includes('consumable')) {
      return 'consumeveis';
    }
    if (name.includes('leather') || name.includes('couro') || name.includes('wood') || name.includes('madeira') || name.includes('metal') || 
        name.includes('ferro') || name.includes('cascalho') || name.includes('carvao')) {
      return 'materiais';
    }
    if (name.includes('plant') || name.includes('planta') || name.includes('flower') || name.includes('flor') || name.includes('trigo') || name.includes('milho')) {
      return 'plantas';
    }
    
    return 'outros';
  };

  // Process extension data to create inventory
  const processExtensionData = () => {
    // This will be populated by browser extension data
    // For now, return empty inventory
    return {
      itens: {},
      total_itens: 0,
      total_quantidade: 0
    };
  };

  // Get filtered and sorted inventory items
  const getFilteredAndSortedItems = () => {
    if (!inventory.itens) return [];

    let items = Object.entries(inventory.itens).map(([id, item]) => ({
      id,
      ...item,
      displayName: item.nome || normalizeText(id),
      categoria: item.categoria || getCategoryForItem(item.nome || id)
    }));

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.displayName.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower) ||
        (categories[item.categoria] || '').toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (selectedCategory !== 'todos') {
      items = items.filter(item => item.categoria === selectedCategory);
    }

    // Quantity filter
    if (!showZeroQuantity) {
      items = items.filter(item => (item.quantidade || 0) > 0);
    }

    switch (quantityFilter) {
      case 'zero':
        items = items.filter(item => (item.quantidade || 0) === 0);
        break;
      case 'low':
        items = items.filter(item => (item.quantidade || 0) > 0 && (item.quantidade || 0) <= 10);
        break;
      case 'medium':
        items = items.filter(item => (item.quantidade || 0) > 10 && (item.quantidade || 0) <= 100);
        break;
      case 'high':
        items = items.filter(item => (item.quantidade || 0) > 100);
        break;
    }

    // Sort items
    items.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortColumn) {
        case 'quantidade':
          aValue = a.quantidade || 0;
          bValue = b.quantidade || 0;
          break;
        case 'categoria':
          aValue = categories[a.categoria] || 'Outros';
          bValue = categories[b.categoria] || 'Outros';
          break;
        case 'criado_em':
          aValue = new Date(a.criado_em || 0);
          bValue = new Date(b.criado_em || 0);
          break;
        case 'atualizado_em':
          aValue = new Date(a.atualizado_em || a.ultima_atualizacao || 0);
          bValue = new Date(b.atualizado_em || b.ultima_atualizacao || 0);
          break;
        case 'nome':
        default:
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
      }

      if (sortDirection === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return items;
  };

  // Get paginated items
  const getPaginatedItems = () => {
    const filteredItems = getFilteredAndSortedItems();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      items: filteredItems.slice(startIndex, endIndex),
      totalItems: filteredItems.length,
      totalPages: Math.ceil(filteredItems.length / itemsPerPage)
    };
  };

  // Handle sort column change
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('todos');
    setQuantityFilter('all');
    setShowZeroQuantity(true);
    setCurrentPage(1);
  };

  useEffect(() => {
    // Initialize with extension data
    const initialInventory = processExtensionData();
    setInventory(initialInventory);
    setLoading(false);

    // Listen for extension data updates
    const handleExtensionUpdate = (event) => {
      console.log('📦 Processing extension data for inventory:', event.detail);
      
      // Process extension messages to build inventory
      const messages = event.detail || [];
      const itemCounts = {};

      messages.forEach(msg => {
        const content = msg.content || '';
        
        // Parse item additions
        if (content.includes('INSERIR ITEM') || content.includes('inserir item')) {
          const itemMatch = content.match(/Item adicionado:(.+?)\s*x(\d+)/i);
          if (itemMatch) {
            const itemName = itemMatch[1].trim();
            const quantity = parseInt(itemMatch[2]);
            
            if (!itemCounts[itemName]) {
              itemCounts[itemName] = { quantidade: 0, nome: normalizeText(itemName) };
            }
            itemCounts[itemName].quantidade += quantity;
          }
        }
        
        // Parse item removals
        if (content.includes('REMOVER ITEM') || content.includes('remover item')) {
          const itemMatch = content.match(/Item removido:(.+?)\s*x(\d+)/i);
          if (itemMatch) {
            const itemName = itemMatch[1].trim();
            const quantity = parseInt(itemMatch[2]);
            
            if (!itemCounts[itemName]) {
              itemCounts[itemName] = { quantidade: 0, nome: normalizeText(itemName) };
            }
            itemCounts[itemName].quantidade -= quantity;
            
            // Don't allow negative quantities
            if (itemCounts[itemName].quantidade < 0) {
              itemCounts[itemName].quantidade = 0;
            }
          }
        }
      });

      // Update inventory state
      const updatedInventory = {
        itens: itemCounts,
        total_itens: Object.keys(itemCounts).length,
        total_quantidade: Object.values(itemCounts).reduce((sum, item) => sum + item.quantidade, 0)
      };

      setInventory(updatedInventory);
    };

    // Set up listener for extension data
    window.addEventListener('extensionData', handleExtensionUpdate);

    return () => {
      window.removeEventListener('extensionData', handleExtensionUpdate);
    };
  }, []);

  if (loading && !inventory.itens) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        📦 Estoque - Fazenda BW
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <InventoryIcon fontSize="large" color="primary" />
              <Typography variant="h4" color="primary.main" sx={{ mt: 1 }}>
                {inventory.total_itens || 0}
              </Typography>
              <Typography color="textSecondary">
                Tipos de Itens
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {inventory.total_quantidade || 0}
              </Typography>
              <Typography color="textSecondary">
                Quantidade Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {Object.keys(categories).length}
              </Typography>
              <Typography color="textSecondary">
                Categorias
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Extension Status */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'info.light' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ color: 'info.contrastText' }}>
            🔗 Status: {inventory.total_itens > 0 ? 'Dados da extensão carregados' : 'Aguardando dados da extensão...'}
          </Typography>
          {inventory.total_itens > 0 && (
            <Chip 
              label={`${inventory.total_itens} tipos de itens processados`} 
              color="info" 
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Enhanced Filtering and Search */}
      <Paper elevation={2} sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Pesquisar itens..."
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
            <InputLabel>Categoria</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label="Categoria"
            >
              <MenuItem value="todos">Todas</MenuItem>
              {Object.entries(categories).map(([key, name]) => (
                <MenuItem key={key} value={key}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Quantidade</InputLabel>
            <Select
              value={quantityFilter}
              onChange={(e) => setQuantityFilter(e.target.value)}
              label="Quantidade"
            >
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="zero">Zero (0)</MenuItem>
              <MenuItem value="low">Baixo (1-10)</MenuItem>
              <MenuItem value="medium">Médio (11-100)</MenuItem>
              <MenuItem value="high">Alto (100+)</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showZeroQuantity}
                onChange={(e) => setShowZeroQuantity(e.target.checked)}
                size="small"
              />
            }
            label="Mostrar Zero"
          />

          <IconButton onClick={clearFilters} title="Limpar Filtros">
            <ClearIcon />
          </IconButton>
        </Box>
      </Paper>

      {/* Inventory Table */}
      <Paper elevation={2}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              📦 Lista de Estoque
            </Typography>
            <Chip 
              label={`${getPaginatedItems().totalItems} itens`} 
              color="primary" 
              size="small" 
            />
          </Box>
          <IconButton
            onClick={() => setInventoryExpanded(!inventoryExpanded)}
            sx={{ 
              transform: inventoryExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={inventoryExpanded}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortColumn === 'nome'}
                      direction={sortColumn === 'nome' ? sortDirection : 'asc'}
                      onClick={() => handleSort('nome')}
                    >
                      <strong>Nome do Item</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortColumn === 'categoria'}
                      direction={sortColumn === 'categoria' ? sortDirection : 'asc'}
                      onClick={() => handleSort('categoria')}
                    >
                      <strong>Categoria</strong>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortColumn === 'quantidade'}
                      direction={sortColumn === 'quantidade' ? sortDirection : 'asc'}
                      onClick={() => handleSort('quantidade')}
                    >
                      <strong>Quantidade</strong>
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getPaginatedItems().totalItems === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography color="textSecondary" sx={{ py: 4 }}>
                        {searchTerm ? 'Nenhum item encontrado para a pesquisa' :
                         selectedCategory !== 'todos' ? `Nenhum item na categoria "${categories[selectedCategory]}"` :
                         'Nenhum item no estoque'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  getPaginatedItems().items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {item.displayName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {item.id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={categories[item.categoria] || 'Outros'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={item.quantidade || 0}
                          color={
                            (item.quantidade || 0) > 100 ? 'success' : 
                            (item.quantidade || 0) > 10 ? 'warning' : 
                            (item.quantidade || 0) > 0 ? 'info' : 'error'
                          }
                          size="medium"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {getPaginatedItems().totalPages > 1 && (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="textSecondary">
                Página {currentPage} de {getPaginatedItems().totalPages} ({getPaginatedItems().totalItems} itens)
              </Typography>
              <Pagination
                count={getPaginatedItems().totalPages}
                page={currentPage}
                onChange={(event, value) => setCurrentPage(value)}
                color="primary"
                size="small"
              />
            </Box>
          )}
        </Collapse>
      </Paper>
    </Box>
  );
};

export default Estoque;