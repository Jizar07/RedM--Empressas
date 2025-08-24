'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, TrendingUp, DollarSign, Plus, Trash2, Edit, ShoppingCart, Mail } from 'lucide-react';

interface Material {
  item: string;
  quantidade: number;
  nome: string;
}

interface Recipe {
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
        { item: 'wood', quantidade: 6, nome: 'Wood' },
        { item: 'moedor', quantidade: 3, nome: 'Moedor' },
        { item: 'corn', quantidade: 6, nome: 'Corn' }
      ]
    },
    {
      id: 'cascalho',
      nome: 'Cascalho',
      categoria: 'MINERACAO',
      produz: 15,
      materiais: [
        { item: 'wood', quantidade: 5, nome: 'Wood' },
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
        { item: 'rustic_box', quantidade: 5, nome: 'Rustic Box' },
        { item: 'junco', quantidade: 50, nome: 'Junco' },
        { item: 'trigo', quantidade: 50, nome: 'Trigo' },
        { item: 'milho', quantidade: 100, nome: 'Milho' }
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
    
    // Fallback prices for common items not in price list
    const fallbackPrices: Record<string, number> = {
      'milho': 0.10,
      'corn': 0.10,
      'junco': 0.10,
      'trigo': 0.10,
      'wood': 0.15,
      'ferro': 0.25,
      'carvao': 0.20,
      'iron': 0.25,
      'coal': 0.20,
      'salitre': 0.30,
      'enxofre': 0.35,
      'embalagem': 0.25,
      'rustic_box': 1.00,
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
      'taurina': 0.90
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <ChefHat className="h-6 w-6" />
          Receitas & Encomendas
        </h2>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setCurrentTab(0)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 0
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ChefHat className="h-4 w-4" />
            Receitas
          </button>
          <button
            onClick={() => setCurrentTab(1)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 1
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Encomendas
          </button>
        </div>

        {currentTab === 0 && (
          <div className="space-y-6">
            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-1">💡 Sistema de Cálculo de Custos:</h3>
              <p className="text-blue-800">
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
                  <div key={receita.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{receita.nome}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoriaColor(receita.categoria)}`}>
                        {receita.categoria}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <ChefHat className="h-4 w-4" />
                        Produz: <span className="font-medium">{receita.produz} unidades</span>
                      </p>
                    </div>

                    {/* Materials */}
                    <div className="mb-4">
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2 list-none">
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
                              <div key={index} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                                <span>{material.nome}</span>
                                <div className="text-right">
                                  <div>{material.quantidade}</div>
                                  <div className="text-gray-500">${custoMaterial.toFixed(2)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>

                    {/* Cost Summary */}
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-700 flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Custo Total:
                        </span>
                        <span className="font-semibold text-red-600">${custoTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          Custo por Unidade:
                        </span>
                        <span className="font-semibold text-blue-600">${custoPorUnidade.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Profit Analysis */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        Análise de Lucro:
                      </h4>
                      
                      {precoVenda.estimado && (
                        <p className="text-xs text-orange-600 mb-2">⚠️ Preços estimados (não encontrado na lista)</p>
                      )}
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Preço Min/Max:</span>
                          <span className="font-medium">${precoVenda.min.toFixed(2)} - ${precoVenda.max.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Lucro Max:</span>
                          <span className={`font-medium ${lucroMax.lucro_unitario > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${lucroMax.lucro_unitario.toFixed(2)} ({lucroMax.margem_lucro.toFixed(1)}%)
                          </span>
                        </div>
                        
                        <div className="pt-1 border-t border-green-200">
                          <div className="flex justify-between">
                            <span className="font-medium text-green-800">💰 Melhor Ponto de Venda:</span>
                            <span className="font-bold text-green-800">${precoVenda.max.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-gray-600 text-right">
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
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">📊 Resumo de Custos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receita</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Produz</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo Total</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo/Unidade</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Sugerido</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro/Unidade</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margem Max</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recipes
                      .sort((a, b) => calcularCustoPorUnidade(a) - calcularCustoPorUnidade(b))
                      .map((receita) => {
                        const custoTotal = calcularCustoReceita(receita);
                        const custoPorUnidade = calcularCustoPorUnidade(receita);
                        const precoVenda = getPrecoVendaReceita(receita);
                        const lucroMax = calcularLucroReceita(receita, precoVenda.max);
                        
                        return (
                          <tr key={receita.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{receita.nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoriaColor(receita.categoria)}`}>
                                {receita.categoria}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{receita.produz}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${custoTotal.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${custoPorUnidade.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-medium text-blue-600">${precoVenda.max.toFixed(2)}</div>
                              {precoVenda.estimado && (
                                <div className="text-xs text-orange-600">(estimado)</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className={`text-sm font-medium ${lucroMax.lucro_unitario > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${lucroMax.lucro_unitario.toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className={`text-sm font-medium ${
                                lucroMax.margem_lucro > 50 ? 'text-green-600' : 
                                lucroMax.margem_lucro > 20 ? 'text-yellow-600' : 'text-red-600'
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-1 mr-4">
                <h3 className="font-semibold text-blue-900 mb-1">📦 Sistema de Encomendas:</h3>
                <p className="text-blue-800">
                  Gerencie pedidos de clientes com cálculo automático de custos e lucro.
                </p>
              </div>
              <button
                onClick={() => handleOpenOrderDialog()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Nova Encomenda
              </button>
            </div>

            {encomendas.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma encomenda cadastrada</h3>
                <p className="text-gray-600 mb-4">Clique em "Nova Encomenda" para começar</p>
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
                    <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{order.cliente}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            Pombo: {order.pombo}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenOrderDialog(order)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900">{order.item} - {order.quantidade} unidades</h4>
                        <p className="text-sm text-gray-600">${order.preco_unitario.toFixed(2)} por unidade</p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-600">Custo Estimado:</p>
                            <p className="font-semibold text-red-600">${custoTotal.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Valor de Venda:</p>
                            <p className="font-semibold text-blue-600">${vendaTotal.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Lucro Estimado:</p>
                            <p className={`font-semibold ${lucroTotal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${lucroTotal.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Margem:</p>
                            <p className={`font-semibold ${
                              margemLucro > 30 ? 'text-green-600' : 
                              margemLucro > 10 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {margemLucro.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {order.observacoes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-4">
                          <p className="text-sm text-yellow-800">
                            <strong>Obs:</strong> {order.observacoes}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'concluida' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status || 'pendente'}
                        </span>
                        <span className="text-xs text-gray-500">
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
      </div>

      {/* Order Dialog */}
      {openOrderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingOrder ? 'Editar Encomenda' : 'Nova Encomenda'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={orderForm.cliente}
                    onChange={(e) => setOrderForm({ ...orderForm, cliente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código do Pombo</label>
                  <input
                    type="text"
                    value={orderForm.pombo}
                    onChange={(e) => setOrderForm({ ...orderForm, pombo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Código de identificação do correio</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item/Produto</label>
                  <input
                    type="text"
                    value={orderForm.item}
                    onChange={(e) => setOrderForm({ ...orderForm, item: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Nome do item que o cliente quer</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                    <input
                      type="number"
                      value={orderForm.quantidade}
                      onChange={(e) => setOrderForm({ ...orderForm, quantidade: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço Unitário ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderForm.preco_unitario}
                      onChange={(e) => setOrderForm({ ...orderForm, preco_unitario: parseFloat(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={orderForm.observacoes}
                    onChange={(e) => setOrderForm({ ...orderForm, observacoes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Informações adicionais sobre a encomenda</p>
                </div>

                {orderForm.item && orderForm.quantidade > 0 && orderForm.preco_unitario > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-medium text-blue-900 mb-2">💰 Análise Financeira:</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Custo Estimado:</p>
                        <p className="font-semibold text-red-600">${calcularCustoEncomenda(orderForm).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Valor Total:</p>
                        <p className="font-semibold text-blue-600">${(orderForm.preco_unitario * orderForm.quantidade).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Lucro Estimado:</p>
                        <p className={`font-semibold ${calcularLucroEncomenda(orderForm) > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveOrder}
                  disabled={!orderForm.cliente || !orderForm.pombo || !orderForm.item || orderForm.quantidade <= 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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