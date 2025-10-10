'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, TrendingUp, DollarSign, Plus, Trash2, Edit, ShoppingCart, Mail, BarChart3, Calculator } from 'lucide-react';
import ProductionDashboard from './ProductionDashboard';
import RecipeCalculator from './RecipeCalculator';

export interface Material {
  item: string;
  quantidade: number;
  nome: string;
}

export interface Recipe {
  id: string;
  nome: string;
  categoria: string;
  produz: number;
  materiais: Material[];
}

interface Order {
  id: number;
  cliente: string;
  pombo: string;
  item: string;
  quantidade: number;
  preco_unitario: number;
  observacoes: string;
  data_criacao: string;
  status: string;
}

interface PricingItem {
  preco_min: number;
  preco_max: number;
  nome: string;
}

const Recipes = () => {
  const [precos, setPrecos] = useState<Record<string, PricingItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab management
  const [currentTab, setCurrentTab] = useState(0);
  
  // Encomendas state
  const [encomendas, setEncomendas] = useState<Order[]>([]);
  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderForm, setOrderForm] = useState({
    cliente: '',
    pombo: '',
    item: '',
    quantidade: 1,
    preco_unitario: 0,
    observacoes: ''
  });

  // Recipe definitions
  const recipes: Recipe[] = [
    {
      id: 'saco_milho',
      nome: 'Saco de Milho',
      categoria: 'PROCESSAMENTO',
      produz: 25,
      materiais: [
        { item: 'milho', quantidade: 200, nome: 'Milho' }
      ]
    },
    {
      id: 'amido_milho',
      nome: 'Amido de Milho',
      categoria: 'PROCESSAMENTO',
      produz: 12,
      materiais: [
        { item: 'madeira', quantidade: 6, nome: 'Madeira' },
        { item: 'moedor', quantidade: 3, nome: 'Moedor' },
        { item: 'milho', quantidade: 6, nome: 'Milho' }
      ]
    },
    {
      id: 'cascalho',
      nome: 'Cascalho',
      categoria: 'MINERACAO',
      produz: 15,
      materiais: [
        { item: 'madeira', quantidade: 5, nome: 'Madeira' },
        { item: 'ferro', quantidade: 6, nome: 'Ferro' },
        { item: 'carvao', quantidade: 5, nome: 'Carvão' }
      ]
    },
    {
      id: 'polvora',
      nome: 'Pólvora',
      categoria: 'MINERACAO',
      produz: 24,
      materiais: [
        { item: 'salitre', quantidade: 3, nome: 'Salitre' },
        { item: 'carvao', quantidade: 3, nome: 'Carvão' },
        { item: 'embalagem', quantidade: 6, nome: 'Embalagem' },
        { item: 'enxofre', quantidade: 3, nome: 'Enxofre' }
      ]
    },
    {
      id: 'caixa_agro',
      nome: 'Caixa de Agro',
      categoria: 'CAIXAS',
      produz: 25,
      materiais: [
        { item: 'caixa_rustica', quantidade: 5, nome: 'Caixa Rústica' },
        { item: 'leite_de_mula', quantidade: 12, nome: 'Leite de Mula' },
        { item: 'couro_de_mula', quantidade: 12, nome: 'Couro de Mula' },
        { item: 'la_de_ovelha', quantidade: 12, nome: 'Lã de Ovelha' },
        { item: 'carne_de_porco', quantidade: 12, nome: 'Carne de Porco' },
        { item: 'leite_de_porco', quantidade: 12, nome: 'Leite de Porco' },
        { item: 'leite_de_vaca', quantidade: 12, nome: 'Leite de Vaca' },
        { item: 'crina_de_galo', quantidade: 12, nome: 'Crina de Galo' },
        { item: 'buchada_de_bode', quantidade: 12, nome: 'Buchada de Bode' },
        { item: 'ovos', quantidade: 12, nome: 'Ovos' },
        { item: 'leite_de_cabra', quantidade: 12, nome: 'Leite de Cabra' },
        { item: 'leite_de_ovelha', quantidade: 12, nome: 'Leite de Ovelha' },
        { item: 'taurina', quantidade: 12, nome: 'Taurina' }
      ]
    },
    {
      id: 'caixa_verduras',
      nome: 'Caixa de Verduras',
      categoria: 'CAIXAS',
      produz: 25,
      materiais: [
        { item: 'caixa_rustica', quantidade: 5, nome: 'Caixa Rústica' },
        { item: 'junco', quantidade: 50, nome: 'Junco' },
        { item: 'trigo', quantidade: 50, nome: 'Trigo' },
        { item: 'milho', quantidade: 100, nome: 'Milho' }
      ]
    },
    // Veterinary Recipes - Libidgels
    {
      id: 'libidgel_bovino',
      nome: 'Libidgel Bovino',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'cápsula_plástica', quantidade: 20, nome: 'Cápsula Plástica' },
        { item: 'rótulo_1', quantidade: 20, nome: 'Rótulo' },
        { item: 'seringa_de_vidro', quantidade: 4, nome: 'Seringa de Vidro' },
        { item: 'embalagem', quantidade: 20, nome: 'Embalagem' }
      ]
    },
    {
      id: 'libidgel_suino',
      nome: 'Libidgel Suíno',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'cápsula_plástica', quantidade: 20, nome: 'Cápsula Plástica' },
        { item: 'rótulo_1', quantidade: 20, nome: 'Rótulo' },
        { item: 'seringa_de_vidro', quantidade: 4, nome: 'Seringa de Vidro' },
        { item: 'embalagem', quantidade: 20, nome: 'Embalagem' }
      ]
    },
    {
      id: 'libidgel_aviario',
      nome: 'Libidgel Aviário',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'cápsula_plástica', quantidade: 20, nome: 'Cápsula Plástica' },
        { item: 'rótulo_1', quantidade: 20, nome: 'Rótulo' },
        { item: 'seringa_de_vidro', quantidade: 4, nome: 'Seringa de Vidro' },
        { item: 'embalagem', quantidade: 20, nome: 'Embalagem' }
      ]
    },
    {
      id: 'libidgel_caprino',
      nome: 'Libidgel Caprino',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'cápsula_plástica', quantidade: 20, nome: 'Cápsula Plástica' },
        { item: 'rótulo_1', quantidade: 20, nome: 'Rótulo' },
        { item: 'seringa_de_vidro', quantidade: 4, nome: 'Seringa de Vidro' },
        { item: 'embalagem', quantidade: 20, nome: 'Embalagem' }
      ]
    },
    {
      id: 'libidgel_ovino',
      nome: 'Libidgel Ovino',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'cápsula_plástica', quantidade: 20, nome: 'Cápsula Plástica' },
        { item: 'rótulo_1', quantidade: 20, nome: 'Rótulo' },
        { item: 'seringa_de_vidro', quantidade: 4, nome: 'Seringa de Vidro' },
        { item: 'embalagem', quantidade: 20, nome: 'Embalagem' }
      ]
    },
    {
      id: 'libidgel_asineiro',
      nome: 'Libidgel Asineiro',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'cápsula_plástica', quantidade: 20, nome: 'Cápsula Plástica' },
        { item: 'rótulo_1', quantidade: 20, nome: 'Rótulo' },
        { item: 'seringa_de_vidro', quantidade: 4, nome: 'Seringa de Vidro' },
        { item: 'embalagem', quantidade: 20, nome: 'Embalagem' }
      ]
    },
    // Veterinary Recipes - Animal Feed Portions
    {
      id: 'porcao_comum',
      nome: 'Porção Comum',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'papoula_prado', quantidade: 20, nome: 'Papoula do Prado' },
        { item: 'framboesa_vermelha', quantidade: 20, nome: 'Framboesa Vermelha' }
      ]
    },
    {
      id: 'porcao_cabra',
      nome: 'Porção Comum de Cabra',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'papoula_prado', quantidade: 20, nome: 'Papoula do Prado' },
        { item: 'framboesa_vermelha', quantidade: 20, nome: 'Framboesa Vermelha' }
      ]
    },
    {
      id: 'porcao_mula',
      nome: 'Porção Comum de Mula',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'amora', quantidade: 20, nome: 'Amora' },
        { item: 'groselha_negra', quantidade: 20, nome: 'Groselha Negra' }
      ]
    },
    {
      id: 'porcao_galinha',
      nome: 'Porção Comum de Galinha',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'alho_selvagem', quantidade: 20, nome: 'Alho Selvagem' },
        { item: 'salvia_oleandro', quantidade: 20, nome: 'Sálvia Oleandro' }
      ]
    },
    {
      id: 'porcao_ovelha',
      nome: 'Porção Comum de Ovelha',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'cogumelo_parasol', quantidade: 20, nome: 'Cogumelo Parasol' },
        { item: 'oregano', quantidade: 20, nome: 'Orégano' }
      ]
    },
    {
      id: 'porcao_porco',
      nome: 'Porção Comum de Porco',
      categoria: 'VETERINARIA',
      produz: 10,
      materiais: [
        { item: 'ameixa_brejo', quantidade: 20, nome: 'Ameixa do Brejo' },
        { item: 'graos_cafe', quantidade: 20, nome: 'Grãos de Café' }
      ]
    },
    // Veterinary Supplies
    {
      id: 'caixa_veterinaria',
      nome: 'Caixa de Veterinária',
      categoria: 'VETERINARIA',
      produz: 25,
      materiais: [
        { item: 'libidgel_ovino', quantidade: 5, nome: 'Libidgel Ovino' },
        { item: 'libidgel_asineiro', quantidade: 5, nome: 'Libidgel Asineiro' },
        { item: 'porcao_porco', quantidade: 20, nome: 'Porção Comum de Porco' }
      ]
    },
    // Artesanato (Crafting)
    {
      id: 'garrafa_de_vidro',
      nome: 'Garrafa de Vidro',
      categoria: 'ARTESANATO',
      produz: 20,
      materiais: [
        { item: 'pedra_de_silica', quantidade: 4, nome: 'Pedra de Sílica' },
        { item: 'carvao', quantidade: 4, nome: 'Carvão' },
        { item: 'quartzo', quantidade: 4, nome: 'Quartzo' }
      ]
    },
    {
      id: 'linha_de_algodao',
      nome: 'Linha de Algodão',
      categoria: 'ARTESANATO',
      produz: 12,
      materiais: [
        { item: 'algodao', quantidade: 3, nome: 'Algodão' },
        { item: 'fibras', quantidade: 6, nome: 'Fibras' }
      ]
    },
    {
      id: 'tinta',
      nome: 'Tinta',
      categoria: 'ARTESANATO',
      produz: 26,
      materiais: [
        { item: 'agua', quantidade: 3, nome: 'Água' },
        { item: 'po_de_cafe', quantidade: 3, nome: 'Pó de Café' }
      ]
    },
    {
      id: 'capsula_plastica',
      nome: 'Cápsula Plástica',
      categoria: 'ARTESANATO',
      produz: 25,
      materiais: [
        { item: 'pedra_de_silica', quantidade: 5, nome: 'Pedra de Sílica' },
        { item: 'alcool_industrial', quantidade: 6, nome: 'Álcool Industrial' },
        { item: 'amido_de_milho', quantidade: 3, nome: 'Amido de Milho' }
      ]
    },
    {
      id: 'alca_de_couro',
      nome: 'Alça de Couro',
      categoria: 'ARTESANATO',
      produz: 15,
      materiais: [
        { item: 'linha_de_algodao', quantidade: 4, nome: 'Linha de Algodão' },
        { item: 'algodao', quantidade: 6, nome: 'Algodão' },
        { item: 'pele_de_jacare', quantidade: 1, nome: 'Pele de Jacaré' }
      ]
    },
    {
      id: 'rotulo',
      nome: 'Rótulo',
      categoria: 'ARTESANATO',
      produz: 20,
      materiais: [
        { item: 'tinta', quantidade: 6, nome: 'Tinta' },
        { item: 'milk_weed', quantidade: 6, nome: 'Milk Weed' }
      ]
    },
    {
      id: 'mochila_20kg',
      nome: 'Mochila 20kg',
      categoria: 'ARTESANATO',
      produz: 4,
      materiais: [
        { item: 'alca_de_couro', quantidade: 6, nome: 'Alça de Couro' },
        { item: 'linha_de_algodao', quantidade: 14, nome: 'Linha de Algodão' },
        { item: 'pele_de_lobo', quantidade: 2, nome: 'Pele de Lobo' },
        { item: 'pele_de_jacare', quantidade: 2, nome: 'Pele de Jacaré' }
      ]
    },
    {
      id: 'embalagem_artesanato',
      nome: 'Embalagem',
      categoria: 'ARTESANATO',
      produz: 26,
      materiais: [
        { item: 'alcool_industrial', quantidade: 6, nome: 'Álcool Industrial' },
        { item: 'quartzo', quantidade: 3, nome: 'Quartzo' },
        { item: 'amido_de_milho', quantidade: 3, nome: 'Amido de Milho' }
      ]
    },
    {
      id: 'verniz',
      nome: 'Verniz',
      categoria: 'ARTESANATO',
      produz: 24,
      materiais: [
        { item: 'madeira', quantidade: 6, nome: 'Madeira' },
        { item: 'fruta_wintergreen', quantidade: 6, nome: 'Fruta Wintergreen' },
        { item: 'tinta', quantidade: 2, nome: 'Tinta' },
        { item: 'agua', quantidade: 5, nome: 'Água' }
      ]
    },
    {
      id: 'caixa_de_artesanato',
      nome: 'Caixa de Artesanato',
      categoria: 'ARTESANATO',
      produz: 25,
      materiais: [
        { item: 'embalagem', quantidade: 10, nome: 'Embalagem' },
        { item: 'picareta', quantidade: 1, nome: 'Picareta' },
        { item: 'mochila', quantidade: 10, nome: 'Mochila' },
        { item: 'boneca_de_pano', quantidade: 1, nome: 'Boneca de Pano' }
      ]
    },
    {
      id: 'coador',
      nome: 'Coador',
      categoria: 'ARTESANATO',
      produz: 26,
      materiais: [
        { item: 'madeira', quantidade: 3, nome: 'Madeira' },
        { item: 'linha_de_algodao', quantidade: 6, nome: 'Linha de Algodão' }
      ]
    },
    {
      id: 'caixa_rustica_artesanato',
      nome: 'Caixa Rústica',
      categoria: 'ARTESANATO',
      produz: 45,
      materiais: [
        { item: 'madeira_cubica', quantidade: 3, nome: 'Madeira Cúbica' },
        { item: 'madeira_lapidada', quantidade: 3, nome: 'Madeira Lapidada' },
        { item: 'madeira_cilindrica', quantidade: 3, nome: 'Madeira Cilíndrica' }
      ]
    }
  ];

  useEffect(() => {
    loadPrecos();
    loadEncomendas();
  }, []);

  const loadEncomendas = () => {
    // Load from localStorage for now - could be moved to backend later
    const savedOrders = localStorage.getItem('encomendas');
    if (savedOrders) {
      setEncomendas(JSON.parse(savedOrders));
    }
  };

  const saveEncomendas = (newEncomendas: Order[]) => {
    localStorage.setItem('encomendas', JSON.stringify(newEncomendas));
    setEncomendas(newEncomendas);
  };

  const loadPrecos = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API when available
      setPrecos({});
      setError(null);
    } catch (error) {
      console.error('Error loading prices:', error);
      setError('Erro ao carregar lista de preços');
    } finally {
      setLoading(false);
    }
  };

  const getPrecoItem = (itemId: string): number => {
    const item = precos[itemId];
    if (item) {
      return (item.preco_min + item.preco_max) / 2;
    }
    
    // Fallback prices for common items not in price list (Portuguese names only)
    const fallbackPrices: Record<string, number> = {
      'milho': 0.10,
      'junco': 0.10,
      'trigo': 0.10,
      'madeira': 0.15,
      'ferro': 0.25,
      'carvao': 0.20,
      'salitre': 0.30,
      'enxofre': 0.35,
      'embalagem': 0.71,
      'moedor': 0.60,
      'caixa_rustica': 1.00,
      'leite_de_mula': 0.50,
      'couro_de_mula': 0.80,
      'la_de_ovelha': 0.60,
      'carne_de_porco': 0.70,
      'leite_de_porco': 0.45,
      'leite_de_vaca': 0.55,
      'crina_de_galo': 0.65,
      'buchada_de_bode': 0.75,
      'ovos': 0.40,
      'leite_de_cabra': 0.50,
      'leite_de_ovelha': 0.50,
      'taurina': 0.90,
      // Veterinary base materials (using PriceList averages)
      'cápsula_plástica': 0.81,
      'rótulo_1': 0.605,
      'seringa_de_vidro': 0.81,
      // Plant ingredients (all at 0.25 as specified)
      'papoula_prado': 0.25,
      'framboesa_vermelha': 0.25,
      'amora': 0.25,
      'groselha_negra': 0.25,
      'alho_selvagem': 0.25,
      'salvia_oleandro': 0.25,
      'cogumelo_parasol': 0.25,
      'oregano': 0.25,
      'ameixa_brejo': 0.25,
      'graos_cafe': 0.25,
      // Intermediate products (calculated from their recipes)
      'libidgel_bovino': 4.574,
      'libidgel_suino': 4.574,
      'libidgel_aviario': 4.574,
      'libidgel_caprino': 4.574,
      'libidgel_ovino': 4.574,
      'libidgel_asineiro': 4.574,
      'porcao_comum': 1.0,
      'porcao_cabra': 1.0,
      'porcao_mula': 1.0,
      'porcao_galinha': 1.0,
      'porcao_ovelha': 1.0,
      'porcao_porco': 1.0,
      // Artesanato materials
      'pedra_de_silica': 0.35,
      'quartzo': 0.40,
      'algodao': 0.25,
      'fibras': 0.20,
      'agua': 0.05,
      'po_de_cafe': 0.30,
      'alcool_industrial': 0.45,
      'amido_de_milho': 0.60,
      'linha_de_algodao': 0.80,
      'pele_de_jacare': 1.20,
      'milk_weed': 0.25,
      'tinta': 1.15,
      'alca_de_couro': 2.50,
      'pele_de_lobo': 1.50,
      'fruta_wintergreen': 0.25,
      'madeira': 0.15,
      'picareta': 2.00,
      'mochila': 5.00,
      'boneca_de_pano': 3.00,
      'madeira_cubica': 0.20,
      'madeira_lapidada': 0.20,
      'madeira_cilindrica': 0.20
    };
    
    return fallbackPrices[itemId] || 0;
  };

  const calcularCustoReceita = (receita: Recipe): number => {
    // Use correct costs for box recipes based on actual production costs
    if (receita.id === 'caixa_agro') {
      return 15.17;
    }
    
    if (receita.id === 'caixa_verduras') {
      return 32.50;
    }
    
    // Default calculation for other recipes
    return receita.materiais.reduce((total, material) => {
      const precoUnitario = getPrecoItem(material.item);
      return total + (precoUnitario * material.quantidade);
    }, 0);
  };

  const calcularCustoPorUnidade = (receita: Recipe): number => {
    const custoTotal = calcularCustoReceita(receita);
    return custoTotal / receita.produz;
  };

  const getCategoriaColor = (categoria: string): string => {
    switch (categoria) {
      case 'PROCESSAMENTO': return 'bg-blue-100 text-blue-800';
      case 'MINERACAO': return 'bg-purple-100 text-purple-800';
      case 'CAIXAS': return 'bg-green-100 text-green-800';
      case 'VETERINARIA': return 'bg-pink-100 text-pink-800';
      case 'ARTESANATO': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrecoVendaReceita = (receita: Recipe) => {
    // Mock price data - replace with actual API call
    const custoUnitario = calcularCustoPorUnidade(receita);
    return {
      min: custoUnitario * 1.3,
      max: custoUnitario * 2.0,
      nome: receita.nome,
      estimado: true
    };
  };

  const calcularLucroReceita = (receita: Recipe, precoVenda: number) => {
    const custoUnitario = calcularCustoPorUnidade(receita);
    const lucroUnitario = precoVenda - custoUnitario;
    const margemLucro = (lucroUnitario / precoVenda) * 100;
    
    return {
      lucro_unitario: lucroUnitario,
      lucro_total: lucroUnitario * receita.produz,
      margem_lucro: margemLucro
    };
  };

  const handleOpenOrderDialog = (order: Order | null = null) => {
    if (order) {
      setEditingOrder(order);
      setOrderForm({
        cliente: order.cliente,
        pombo: order.pombo,
        item: order.item,
        quantidade: order.quantidade,
        preco_unitario: order.preco_unitario,
        observacoes: order.observacoes
      });
    } else {
      setEditingOrder(null);
      setOrderForm({
        cliente: '',
        pombo: '',
        item: '',
        quantidade: 1,
        preco_unitario: 0,
        observacoes: ''
      });
    }
    setOpenOrderDialog(true);
  };

  const handleCloseOrderDialog = () => {
    setOpenOrderDialog(false);
    setEditingOrder(null);
  };

  const handleSaveOrder = () => {
    const newOrder: Order = {
      ...orderForm,
      id: editingOrder ? editingOrder.id : Date.now(),
      data_criacao: editingOrder ? editingOrder.data_criacao : new Date().toISOString(),
      status: editingOrder ? editingOrder.status : 'pendente'
    };

    let newEncomendas: Order[];
    if (editingOrder) {
      newEncomendas = encomendas.map(order => 
        order.id === editingOrder.id ? newOrder : order
      );
    } else {
      newEncomendas = [...encomendas, newOrder];
    }

    saveEncomendas(newEncomendas);
    handleCloseOrderDialog();
  };

  const handleDeleteOrder = (orderId: number) => {
    const newEncomendas = encomendas.filter(order => order.id !== orderId);
    saveEncomendas(newEncomendas);
  };

  const calcularCustoEncomenda = (order: typeof orderForm): number => {
    // Try to find a recipe that produces this item
    const recipe = recipes.find(r => 
      r.nome.toLowerCase().includes(order.item.toLowerCase()) ||
      order.item.toLowerCase().includes(r.nome.toLowerCase())
    );

    if (recipe) {
      const custoUnitario = calcularCustoPorUnidade(recipe);
      return custoUnitario * order.quantidade;
    }

    // If no recipe found, use base material cost
    const materialCost = getPrecoItem(order.item) * 0.7;
    return materialCost * order.quantidade;
  };

  const calcularLucroEncomenda = (order: typeof orderForm): number => {
    const custoTotal = calcularCustoEncomenda(order);
    const vendaTotal = order.preco_unitario * order.quantidade;
    return vendaTotal - custoTotal;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 transition-colors">
          <ChefHat className="h-6 w-6" />
          Receitas & Encomendas
        </h2>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6 transition-colors">
          <button
            onClick={() => setCurrentTab(0)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 0
                ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ChefHat className="h-4 w-4" />
            Receitas
          </button>
          <button
            onClick={() => setCurrentTab(1)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 1
                ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Encomendas
          </button>
          <button
            onClick={() => setCurrentTab(2)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 2
                ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Otimização
          </button>
          <button
            onClick={() => setCurrentTab(3)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 3
                ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Calculator className="h-4 w-4" />
            Calculadora
          </button>
        </div>

        {currentTab === 0 && (
          <div className="space-y-6">
            {/* Info Alert */}
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 transition-colors">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1 transition-colors">💡 Sistema de Cálculo de Custos:</h3>
              <p className="text-blue-800 dark:text-blue-200 transition-colors">
                Os custos são calculados automaticamente baseado na lista de preços atual.
                Preços não encontrados usam valores padrão estimados.
              </p>
            </div>

            {/* Recipes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((receita) => {
                const custoTotal = calcularCustoReceita(receita);
                const custoPorUnidade = calcularCustoPorUnidade(receita);
                const precoVenda = getPrecoVendaReceita(receita);
                const lucroMax = calcularLucroReceita(receita, precoVenda.max);
                
                return (
                  <div key={receita.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">{receita.nome}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoriaColor(receita.categoria)}`}>
                        {receita.categoria}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 transition-colors">
                        <ChefHat className="h-4 w-4" />
                        Produz: <span className="font-medium">{receita.produz} unidades</span>
                      </p>
                    </div>

                    {/* Materials */}
                    <div className="mb-4">
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 list-none transition-colors">
                          <div className="flex items-center justify-between">
                            <span>Materiais Necessários</span>
                            <span className="group-open:rotate-180 transition-transform">▼</span>
                          </div>
                        </summary>
                        <div className="space-y-1 text-xs">
                          {receita.materiais.map((material, index) => {
                            const precoUnitario = getPrecoItem(material.item);
                            const custoMaterial = precoUnitario * material.quantidade;

                            return (
                              <div key={index} className="flex justify-between items-center py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded transition-colors">
                                <span className="text-gray-900 dark:text-gray-100">{material.nome}</span>
                                <div className="text-right">
                                  <div className="text-gray-900 dark:text-gray-100">{material.quantidade}</div>
                                  <div className="text-gray-500 dark:text-gray-400">${custoMaterial.toFixed(2)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>

                    {/* Cost Summary */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-3 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1 transition-colors">
                          <DollarSign className="h-4 w-4" />
                          Custo Total:
                        </span>
                        <span className="font-semibold text-red-600 dark:text-red-400">${custoTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1 transition-colors">
                          <TrendingUp className="h-4 w-4" />
                          Custo por Unidade:
                        </span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">${custoPorUnidade.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Profit Analysis */}
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 transition-colors">
                      <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-1 transition-colors">
                        <TrendingUp className="h-4 w-4" />
                        Análise de Lucro:
                      </h4>

                      {precoVenda.estimado && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">⚠️ Preços estimados (não encontrado na lista)</p>
                      )}

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-gray-900 dark:text-gray-100">
                          <span>Preço Min/Max:</span>
                          <span className="font-medium">${precoVenda.min.toFixed(2)} - ${precoVenda.max.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-900 dark:text-gray-100">Lucro Max:</span>
                          <span className={`font-medium ${lucroMax.lucro_unitario > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            ${lucroMax.lucro_unitario.toFixed(2)} ({lucroMax.margem_lucro.toFixed(1)}%)
                          </span>
                        </div>

                        <div className="pt-1 border-t border-green-200 dark:border-green-700">
                          <div className="flex justify-between">
                            <span className="font-medium text-green-800 dark:text-green-300">💰 Melhor Ponto de Venda:</span>
                            <span className="font-bold text-green-800 dark:text-green-300">${precoVenda.max.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 text-right">
                            Lucro total por lote: ${lucroMax.lucro_total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">📊 Resumo de Custos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Receita</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Categoria</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Produz</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Custo Total</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Custo/Unidade</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Preço Sugerido</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Lucro/Unidade</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Margem Max</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
                    {recipes
                      .sort((a, b) => calcularCustoPorUnidade(a) - calcularCustoPorUnidade(b))
                      .map((receita) => {
                        const custoTotal = calcularCustoReceita(receita);
                        const custoPorUnidade = calcularCustoPorUnidade(receita);
                        const precoVenda = getPrecoVendaReceita(receita);
                        const lucroMax = calcularLucroReceita(receita, precoVenda.max);
                        
                        return (
                          <tr key={receita.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white transition-colors">{receita.nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoriaColor(receita.categoria)}`}>
                                {receita.categoria}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right transition-colors">{receita.produz}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right transition-colors">${custoTotal.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right transition-colors">${custoPorUnidade.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">${precoVenda.max.toFixed(2)}</div>
                              {precoVenda.estimado && (
                                <div className="text-xs text-orange-600 dark:text-orange-400">(estimado)</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className={`text-sm font-medium ${lucroMax.lucro_unitario > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                ${lucroMax.lucro_unitario.toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className={`text-sm font-medium ${
                                lucroMax.margem_lucro > 50 ? 'text-green-600 dark:text-green-400' :
                                lucroMax.margem_lucro > 20 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {lucroMax.margem_lucro.toFixed(1)}%
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentTab === 1 && (
          <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-start">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex-1 mr-4 transition-colors">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1 transition-colors">📦 Sistema de Encomendas:</h3>
                <p className="text-blue-800 dark:text-blue-200 transition-colors">
                  Gerencie pedidos de clientes com cálculo automático de custos e lucro.
                </p>
              </div>
              <button
                onClick={() => handleOpenOrderDialog()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Nova Encomenda
              </button>
            </div>

            {encomendas.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
                <ShoppingCart className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors">Nenhuma encomenda cadastrada</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 transition-colors">Clique em "Nova Encomenda" para começar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {encomendas.map((order) => {
                  const custoTotal = calcularCustoEncomenda({
                    cliente: order.cliente,
                    pombo: order.pombo,
                    item: order.item,
                    quantidade: order.quantidade,
                    preco_unitario: order.preco_unitario,
                    observacoes: order.observacoes
                  });
                  const vendaTotal = order.preco_unitario * order.quantidade;
                  const lucroTotal = calcularLucroEncomenda({
                    cliente: order.cliente,
                    pombo: order.pombo,
                    item: order.item,
                    quantidade: order.quantidade,
                    preco_unitario: order.preco_unitario,
                    observacoes: order.observacoes
                  });
                  const margemLucro = ((lucroTotal / vendaTotal) * 100);

                  return (
                    <div key={order.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">{order.cliente}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 transition-colors">
                            <Mail className="h-4 w-4" />
                            Pombo: {order.pombo}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenOrderDialog(order)}
                            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white transition-colors">{order.item} - {order.quantidade} unidades</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">${order.preco_unitario.toFixed(2)} por unidade</p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4 transition-colors">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Custo Estimado:</p>
                            <p className="font-semibold text-red-600 dark:text-red-400">${custoTotal.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Valor de Venda:</p>
                            <p className="font-semibold text-blue-600 dark:text-blue-400">${vendaTotal.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Lucro Estimado:</p>
                            <p className={`font-semibold ${lucroTotal > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              ${lucroTotal.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Margem:</p>
                            <p className={`font-semibold ${
                              margemLucro > 30 ? 'text-green-600 dark:text-green-400' :
                              margemLucro > 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {margemLucro.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {order.observacoes && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-2 mb-4 transition-colors">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 transition-colors">
                            <strong>Obs:</strong> {order.observacoes}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'concluida'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {order.status || 'pendente'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                          {new Date(order.data_criacao).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentTab === 2 && (
          <div>
            <ProductionDashboard recipes={recipes} priceList={precos} />
          </div>
        )}

        {currentTab === 3 && (
          <div>
            <RecipeCalculator />
          </div>
        )}
      </div>

      {/* Order Dialog */}
      {openOrderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md transition-colors">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">
                {editingOrder ? 'Editar Encomenda' : 'Nova Encomenda'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Nome do Cliente</label>
                  <input
                    type="text"
                    value={orderForm.cliente}
                    onChange={(e) => setOrderForm({ ...orderForm, cliente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Código do Pombo</label>
                  <input
                    type="text"
                    value={orderForm.pombo}
                    onChange={(e) => setOrderForm({ ...orderForm, pombo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Código de identificação do correio</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Item/Produto</label>
                  <input
                    type="text"
                    value={orderForm.item}
                    onChange={(e) => setOrderForm({ ...orderForm, item: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Nome do item que o cliente quer</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Quantidade</label>
                    <input
                      type="number"
                      value={orderForm.quantidade}
                      onChange={(e) => setOrderForm({ ...orderForm, quantidade: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Preço Unitário ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderForm.preco_unitario}
                      onChange={(e) => setOrderForm({ ...orderForm, preco_unitario: parseFloat(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Observações</label>
                  <textarea
                    value={orderForm.observacoes}
                    onChange={(e) => setOrderForm({ ...orderForm, observacoes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Informações adicionais sobre a encomenda</p>
                </div>

                {orderForm.item && orderForm.quantidade > 0 && orderForm.preco_unitario > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 transition-colors">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2 transition-colors">💰 Análise Financeira:</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Custo Estimado:</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">${calcularCustoEncomenda(orderForm).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Valor Total:</p>
                        <p className="font-semibold text-blue-600 dark:text-blue-400">${(orderForm.preco_unitario * orderForm.quantidade).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors">Lucro Estimado:</p>
                        <p className={`font-semibold ${calcularLucroEncomenda(orderForm) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          ${calcularLucroEncomenda(orderForm).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCloseOrderDialog}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveOrder}
                  disabled={!orderForm.cliente || !orderForm.pombo || !orderForm.item || orderForm.quantidade <= 0}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingOrder ? 'Atualizar' : 'Criar'} Encomenda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recipes;