'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Edit, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, RefreshCw } from 'lucide-react';

interface PriceItem {
  preco_min: number;
  preco_max: number;
  nome: string;
  categoria?: string;
  criado_em?: string;
  atualizado_em?: string;
}

interface PriceData {
  itens: Record<string, PriceItem>;
}

const PriceList = () => {
  const [priceData, setPriceData] = useState<PriceData>({ itens: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    preco_min: 0,
    preco_max: 0,
    categoria: 'outros'
  });
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [sortBy, setSortBy] = useState('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  
  // Categories from the original system
  const categories = {
    'ALIMENTACAO': 'Alimentação',
    'ARMARIAS': 'Armarias',
    'FAZENDAS': 'Fazendas',
    'ESTABLOS': 'Establos',
    'FERRARIAS': 'Ferrarias',
    'FOGOS': 'Fogos',
    'ARTESANATO': 'Artesanato',
    'MEDICOS': 'Médicos',
    'DOCERIA': 'Doceria',
    'GRAFICA': 'Gráfica',
    'MUNICAO_ESPECIAL': 'Munição Especial',
    'PADARIA': 'Padaria',
    'CAVALARIA': 'Cavalaria',
    'ATELIE': 'Ateliê',
    'JORNAL': 'Jornal',
    'MADEIREIRA': 'Madeireira',
    'TABACARIA': 'Tabacaria',
    'MINERADORA': 'Mineradora',
    'INDIGENAS': 'Indígenas'
  };

  useEffect(() => {
    loadPriceData();
  }, []);

  const loadPriceData = async () => {
    try {
      setLoading(true);
      // Load from the complete actual data with all 215+ items
      const completeData: PriceData = {
        "itens": {
          "suco_com_fruta": {
            "nome": "Suco com fruta",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.45,
            "preco_max": 0.65,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "tortas_com_fruta": {
            "nome": "Tortas com fruta",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.5,
            "preco_max": 0.75,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "frango_caipira": {
            "nome": "Frango Caipira",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.98,
            "preco_max": 1.47,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "jantar_nordico": {
            "nome": "Jantar Nordico",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "peixe_assado": {
            "nome": "Peixe Assado",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.8,
            "preco_max": 1.2,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "salada_de_frutos_do_mar": {
            "nome": "Salada de Frutos do Mar",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.7,
            "preco_max": 1.05,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "tortilhas_saborosas": {
            "nome": "Tortilhas Saborosas",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.6,
            "preco_max": 0.9,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "salada_de_frutas": {
            "nome": "Salada de Frutas",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.6,
            "preco_max": 0.9,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "batata_recheada": {
            "nome": "Batata Recheada",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.9,
            "preco_max": 1.35,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "pastel": {
            "nome": "Pastel",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.6,
            "preco_max": 0.9,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "temaki": {
            "nome": "Temaki",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.5,
            "preco_max": 0.75,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "yakisoba": {
            "nome": "Yakisoba",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.55,
            "preco_max": 0.85,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "licor_de_café": {
            "nome": "Licor de Café",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.57,
            "preco_max": 0.85,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "refeição_cowboy": {
            "nome": "Refeição Cowboy",
            "categoria": "ALIMENTACAO",
            "preco_min": 1.6,
            "preco_max": 2.4,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "mojitoo_suave": {
            "nome": "Mojitoo Suave",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.65,
            "preco_max": 1,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "whisky21": {
            "nome": "Whisky21",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.55,
            "preco_max": 0.85,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "vodka_com_limão": {
            "nome": "Vodka Com Limão",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.99,
            "preco_max": 1.5,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "hidromel": {
            "nome": "Hidromel",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.55,
            "preco_max": 0.85,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "bjorcidras": {
            "nome": "Bjorcidras",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.6,
            "preco_max": 0.89,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "cerveja_viking": {
            "nome": "Cerveja Viking",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "cerveja": {
            "nome": "Cerveja",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.58,
            "preco_max": 0.86,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "vodka": {
            "nome": "Vodka",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.75,
            "preco_max": 1.25,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "caldo_de_cana": {
            "nome": "Caldo de Cana",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.6,
            "preco_max": 0.9,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "chá": {
            "nome": "Chá",
            "categoria": "ALIMENTACAO",
            "preco_min": 0.8,
            "preco_max": 1.2,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "comidas/bebidas_com_buff_(vida)": {
            "nome": "Comidas/Bebidas com buff (Vida)",
            "categoria": "ALIMENTACAO",
            "preco_min": 2.5,
            "preco_max": 4.85,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "comidas/bebidas_com_buff_(energia)": {
            "nome": "Comidas/Bebidas com buff (Energia)",
            "categoria": "ALIMENTACAO",
            "preco_min": 1.7,
            "preco_max": 4,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "repeti._winchester": {
            "nome": "Repeti. Winchester",
            "categoria": "ARMARIAS",
            "preco_min": 128.5,
            "preco_max": 192.75,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "repeti._henry": {
            "nome": "Repeti. Henry",
            "categoria": "ARMARIAS",
            "preco_min": 115,
            "preco_max": 172.5,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "repeti._evans": {
            "nome": "Repeti. Evans",
            "categoria": "ARMARIAS",
            "preco_min": 115,
            "preco_max": 172.5,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "repeti._carbine": {
            "nome": "Repeti. Carbine",
            "categoria": "ARMARIAS",
            "preco_min": 115,
            "preco_max": 172.5,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "rifle_de_ferrolho": {
            "nome": "Rifle de Ferrolho",
            "categoria": "ARMARIAS",
            "preco_min": 120,
            "preco_max": 180,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "rifle_springfield": {
            "nome": "Rifle Springfield",
            "categoria": "ARMARIAS",
            "preco_min": 120,
            "preco_max": 180,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "shotgun_double": {
            "nome": "Shotgun Double",
            "categoria": "ARMARIAS",
            "preco_min": 130,
            "preco_max": 195,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "pistola_mauser": {
            "nome": "Pistola Mauser",
            "categoria": "ARMARIAS",
            "preco_min": 135,
            "preco_max": 202,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "pistola_volcanic": {
            "nome": "Pistola Volcanic",
            "categoria": "ARMARIAS",
            "preco_min": 45,
            "preco_max": 67.5,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "pistola_semi-auto": {
            "nome": "Pistola Semi-Auto",
            "categoria": "ARMARIAS",
            "preco_min": 45,
            "preco_max": 67.5,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "pistola_m1899": {
            "nome": "Pistola M1899",
            "categoria": "ARMARIAS",
            "preco_min": 120,
            "preco_max": 180,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "revolver_double_action": {
            "nome": "Revolver Double Action",
            "categoria": "ARMARIAS",
            "preco_min": 50,
            "preco_max": 75,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "revolver_vaqueiro_mexicano": {
            "nome": "Revolver Vaqueiro Mexicano",
            "categoria": "ARMARIAS",
            "preco_min": 45,
            "preco_max": 67.5,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "revolver_vaqueiro": {
            "nome": "Revolver Vaqueiro",
            "categoria": "ARMARIAS",
            "preco_min": 45,
            "preco_max": 67.5,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "revolver_lemat": {
            "nome": "Revolver Lemat",
            "categoria": "ARMARIAS",
            "preco_min": 130,
            "preco_max": 195,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "revolver_schofield": {
            "nome": "Revolver Schofield",
            "categoria": "ARMARIAS",
            "preco_min": 45,
            "preco_max": 67.5,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "pano_para_armas": {
            "nome": "Pano para armas",
            "categoria": "ARMARIAS",
            "preco_min": 0.79,
            "preco_max": 1.85,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "personalizações_de_armas_(%_em_cima)": {
            "nome": "Personalizações de armas (% em cima)",
            "categoria": "ARMARIAS",
            "preco_min": 10,
            "preco_max": 25,
            "atualizado_em": "2025-08-24T05:18:16.371Z"
          },
          "munição_de_pistola": {
            "nome": "Munição de pistola",
            "categoria": "ARMARIAS",
            "preco_min": 1.23,
            "preco_max": 1.85,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "munição_de_repetidora": {
            "nome": "Munição de repetidora",
            "categoria": "ARMARIAS",
            "preco_min": 1.23,
            "preco_max": 1.85,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "munição_de_revolver": {
            "nome": "Munição de revolver",
            "categoria": "ARMARIAS",
            "preco_min": 0.87,
            "preco_max": 1.2,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "munição_de_rifle": {
            "nome": "Munição de rifle",
            "categoria": "ARMARIAS",
            "preco_min": 1.84,
            "preco_max": 2.45,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "munição_de_shotgun": {
            "nome": "Munição de shotgun",
            "categoria": "ARMARIAS",
            "preco_min": 1.84,
            "preco_max": 2.45,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "seguro_de_ações_de_rua": {
            "nome": "Seguro de ações de Rua",
            "categoria": "ARMARIAS",
            "preco_min": 100,
            "preco_max": 200,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "farinha_de_trigo": {
            "nome": "Farinha de trigo",
            "categoria": "FAZENDAS",
            "preco_min": 0.52,
            "preco_max": 0.78,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "pólvora": {
            "nome": "Pólvora",
            "categoria": "FAZENDAS",
            "preco_min": 0.59,
            "preco_max": 0.88,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "cascalho": {
            "nome": "Cascalho",
            "categoria": "FAZENDAS",
            "preco_min": 0.77,
            "preco_max": 1.55,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "pó_de_café": {
            "nome": "Pó de café",
            "categoria": "FAZENDAS",
            "preco_min": 0.74,
            "preco_max": 1.1,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "licor_de_café_1": {
            "nome": "Licor de café",
            "categoria": "FAZENDAS",
            "preco_min": 0.57,
            "preco_max": 0.85,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "alcool_artesanal": {
            "nome": "Alcool artesanal",
            "categoria": "FAZENDAS",
            "preco_min": 0.74,
            "preco_max": 1.1,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "alcool_industrial": {
            "nome": "Alcool industrial",
            "categoria": "FAZENDAS",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "fardo_de_leite_integral": {
            "nome": "Fardo de Leite integral",
            "categoria": "FAZENDAS",
            "preco_min": 0.77,
            "preco_max": 1.15,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "levedura": {
            "nome": "Levedura",
            "categoria": "FAZENDAS",
            "preco_min": 0.75,
            "preco_max": 1.25,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "açucar": {
            "nome": "Açucar",
            "categoria": "FAZENDAS",
            "preco_min": 0.61,
            "preco_max": 0.91,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "melado_de_cana": {
            "nome": "Melado de cana",
            "categoria": "FAZENDAS",
            "preco_min": 0.72,
            "preco_max": 1.08,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "amido_de_milho": {
            "nome": "Amido de milho",
            "categoria": "FAZENDAS",
            "preco_min": 0.66,
            "preco_max": 0.99,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "oléo_de_milho": {
            "nome": "Oléo de milho",
            "categoria": "FAZENDAS",
            "preco_min": 0.78,
            "preco_max": 1.17,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "ovo": {
            "nome": "Ovo",
            "categoria": "FAZENDAS",
            "preco_min": 0.2,
            "preco_max": 0.3,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "leite": {
            "nome": "Leite",
            "categoria": "FAZENDAS",
            "preco_min": 0.2,
            "preco_max": 0.3,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "plantações_por_semente_plantada": {
            "nome": "Plantações por semente plantada",
            "categoria": "FAZENDAS",
            "preco_min": 0.07,
            "preco_max": 0.15,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "caixas_empresas": {
            "nome": "Caixas Empresas",
            "categoria": "FAZENDAS",
            "preco_min": 7,
            "preco_max": 7,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "caixa_de_frutas": {
            "nome": "Caixa de frutas",
            "categoria": "FAZENDAS",
            "preco_min": 1.8,
            "preco_max": 2,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "caixa_de_ervas": {
            "nome": "Caixa de ervas",
            "categoria": "FAZENDAS",
            "preco_min": 1.8,
            "preco_max": 2,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "caixa_de_verduras": {
            "nome": "Caixa de Verduras",
            "categoria": "FAZENDAS",
            "preco_min": 1.8,
            "preco_max": 2,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "caixa_de_legumes": {
            "nome": "Caixa de legumes",
            "categoria": "FAZENDAS",
            "preco_min": 1.8,
            "preco_max": 2,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "caixa_de_animais": {
            "nome": "Caixa de animais",
            "categoria": "FAZENDAS",
            "preco_min": 1.8,
            "preco_max": 2,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "sacas_de_milho": {
            "nome": "Sacas de milho",
            "categoria": "FAZENDAS",
            "preco_min": 1,
            "preco_max": 1.5,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "libid-gel_(todos)": {
            "nome": "Libid-gel (todos)",
            "categoria": "FAZENDAS",
            "preco_min": 10,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "raçoes_(todas)": {
            "nome": "Raçoes (Todas)",
            "categoria": "FAZENDAS",
            "preco_min": 1,
            "preco_max": 1.5,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "animais_(todos)": {
            "nome": "Animais (todos)",
            "categoria": "FAZENDAS",
            "preco_min": 20,
            "preco_max": 20,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "ferradura_de_ouro": {
            "nome": "Ferradura de Ouro",
            "categoria": "ESTABLOS",
            "preco_min": 2.86,
            "preco_max": 4.29,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "ferradura_de_ferro": {
            "nome": "Ferradura de Ferro",
            "categoria": "ESTABLOS",
            "preco_min": 1.89,
            "preco_max": 2.83,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "super_boost_equino": {
            "nome": "Super Boost Equino",
            "categoria": "ESTABLOS",
            "preco_min": 0.86,
            "preco_max": 1.29,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "revitalizador_equino": {
            "nome": "Revitalizador Equino",
            "categoria": "ESTABLOS",
            "preco_min": 1.43,
            "preco_max": 2.15,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "escovinha_equina": {
            "nome": "Escovinha Equina",
            "categoria": "ESTABLOS",
            "preco_min": 3.9,
            "preco_max": 5.85,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "flores_equinas": {
            "nome": "Flores Equinas",
            "categoria": "ESTABLOS",
            "preco_min": 0.43,
            "preco_max": 0.65,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "troca_de_ferradura_ouro": {
            "nome": "Troca de Ferradura Ouro",
            "categoria": "ESTABLOS",
            "preco_min": 15,
            "preco_max": 22.5,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "troca_de_ferradura_ferro": {
            "nome": "Troca de Ferradura Ferro",
            "categoria": "ESTABLOS",
            "preco_min": 6.5,
            "preco_max": 9.75,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "treinamento_ouro": {
            "nome": "Treinamento Ouro",
            "categoria": "ESTABLOS",
            "preco_min": 130,
            "preco_max": 195,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "libid_gel_concentrado": {
            "nome": "Libid Gel Concentrado",
            "categoria": "ESTABLOS",
            "preco_min": 3000,
            "preco_max": 3000,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "serviço_de_cruza_/lib_gel_concentrado_trago_de_fora": {
            "nome": "Serviço de cruza /Lib Gel concentrado trago de fora",
            "categoria": "ESTABLOS",
            "preco_min": 1500,
            "preco_max": 1500,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "serviço_de_cruza_do_estabulo/libid_gel_comprado_do_proprio_estabulo": {
            "nome": "Serviço de Cruza do Estabulo/Libid gel comprado do proprio estabulo",
            "categoria": "ESTABLOS",
            "preco_min": 600,
            "preco_max": 600,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "martelinho_de_ouro": {
            "nome": "Martelinho de ouro",
            "categoria": "ESTABLOS",
            "preco_min": 2.1,
            "preco_max": 3.15,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "ração": {
            "nome": "Ração",
            "categoria": "ESTABLOS",
            "preco_min": 0.5,
            "preco_max": 0.8,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "remedio": {
            "nome": "Remedio",
            "categoria": "ESTABLOS",
            "preco_min": 0.5,
            "preco_max": 0.8,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "seringa_reviver_pet": {
            "nome": "Seringa Reviver PET",
            "categoria": "ESTABLOS",
            "preco_min": 0.86,
            "preco_max": 1.29,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "seringa_de_vidro": {
            "nome": "Seringa de vidro",
            "categoria": "FERRARIAS",
            "preco_min": 0.65,
            "preco_max": 0.97,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "cápsula_de_metal": {
            "nome": "Cápsula de metal",
            "categoria": "FERRARIAS",
            "preco_min": 0.52,
            "preco_max": 0.78,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "lingote_de_ferro": {
            "nome": "Lingote de ferro",
            "categoria": "FERRARIAS",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "lingote_de_platina": {
            "nome": "Lingote de platina",
            "categoria": "FERRARIAS",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "lingote_de_ouro": {
            "nome": "Lingote de Ouro",
            "categoria": "FERRARIAS",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "lingote_de_cobre": {
            "nome": "Lingote de Cobre",
            "categoria": "FERRARIAS",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "l._aço_reforçado": {
            "nome": "L. aço reforçado",
            "categoria": "FERRARIAS",
            "preco_min": 1.24,
            "preco_max": 1.85,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "faca_de_esfolar": {
            "nome": "Faca de esfolar",
            "categoria": "FERRARIAS",
            "preco_min": 9.17,
            "preco_max": 13.75,
            "atualizado_em": "2025-08-24T05:18:16.372Z"
          },
          "moedor": {
            "nome": "Moedor",
            "categoria": "FERRARIAS",
            "preco_min": 0.59,
            "preco_max": 0.66,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "tampa_de_garrafa": {
            "nome": "Tampa de garrafa",
            "categoria": "FERRARIAS",
            "preco_min": 0.36,
            "preco_max": 0.55,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "pá_de_escavação": {
            "nome": "Pá de Escavação",
            "categoria": "FERRARIAS",
            "preco_min": 8.52,
            "preco_max": 12.75,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "picareta": {
            "nome": "Picareta",
            "categoria": "FERRARIAS",
            "preco_min": 0.73,
            "preco_max": 1.09,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "cutelo": {
            "nome": "Cutelo",
            "categoria": "FERRARIAS",
            "preco_min": 19.5,
            "preco_max": 29.25,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "pacote_de_facas_de_arremeso": {
            "nome": "Pacote de facas de arremeso",
            "categoria": "FERRARIAS",
            "preco_min": 2,
            "preco_max": 3,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "caixa_de_ferramentas": {
            "nome": "Caixa de ferramentas",
            "categoria": "FERRARIAS",
            "preco_min": 0.78,
            "preco_max": 1.17,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "machadinha": {
            "nome": "Machadinha",
            "categoria": "FERRARIAS",
            "preco_min": 0.78,
            "preco_max": 1.17,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "faca_de_arremeso": {
            "nome": "Faca de arremeso",
            "categoria": "FERRARIAS",
            "preco_min": 10.4,
            "preco_max": 15.6,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "machado_do_caçador": {
            "nome": "Machado do Caçador",
            "categoria": "FERRARIAS",
            "preco_min": 25.77,
            "preco_max": 32.22,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "machete": {
            "nome": "Machete",
            "categoria": "FOGOS",
            "preco_min": 8.75,
            "preco_max": 13.12,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "lampião_a_gas": {
            "nome": "Lampião a gas",
            "categoria": "FOGOS",
            "preco_min": 19.89,
            "preco_max": 29.85,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "lanterna_eletrica": {
            "nome": "Lanterna Eletrica",
            "categoria": "FOGOS",
            "preco_min": 19.89,
            "preco_max": 29.85,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "martelo_importado": {
            "nome": "Martelo Importado",
            "categoria": "FOGOS",
            "preco_min": 8.78,
            "preco_max": 13.17,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "cutelo_1": {
            "nome": "Cutelo",
            "categoria": "FOGOS",
            "preco_min": 19.5,
            "preco_max": 29.25,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "faca_de_esfolar_1": {
            "nome": "Faca de esfolar",
            "categoria": "FOGOS",
            "preco_min": 9.17,
            "preco_max": 13.75,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "pavil": {
            "nome": "Pavil",
            "categoria": "FOGOS",
            "preco_min": 0.78,
            "preco_max": 1.17,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "linha_de_algodão": {
            "nome": "Linha de algodão",
            "categoria": "ARTESANATO",
            "preco_min": 0.43,
            "preco_max": 0.65,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "fardo_de_garrafa_de_vidro": {
            "nome": "Fardo de Garrafa de vidro",
            "categoria": "ARTESANATO",
            "preco_min": 0.49,
            "preco_max": 0.73,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "cápsula_plástica": {
            "nome": "Cápsula plástica",
            "categoria": "ARTESANATO",
            "preco_min": 0.65,
            "preco_max": 0.97,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "alça_de_couro": {
            "nome": "Alça de couro",
            "categoria": "ARTESANATO",
            "preco_min": 0.72,
            "preco_max": 1.08,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "mochila_20kg": {
            "nome": "Mochila 20KG",
            "categoria": "ARTESANATO",
            "preco_min": 10,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "tinta": {
            "nome": "Tinta",
            "categoria": "ARTESANATO",
            "preco_min": 0.36,
            "preco_max": 0.54,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "embalagem": {
            "nome": "Embalagem",
            "categoria": "ARTESANATO",
            "preco_min": 0.57,
            "preco_max": 0.85,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "coador": {
            "nome": "Coador",
            "categoria": "ARTESANATO",
            "preco_min": 0.33,
            "preco_max": 0.49,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "verniz": {
            "nome": "Verniz",
            "categoria": "ARTESANATO",
            "preco_min": 0.46,
            "preco_max": 0.7,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "rótulo": {
            "nome": "Rótulo",
            "categoria": "ARTESANATO",
            "preco_min": 0.48,
            "preco_max": 0.72,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "vara_de_pescar": {
            "nome": "Vara de pescar",
            "categoria": "ARTESANATO",
            "preco_min": 10,
            "preco_max": 20,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "câmera_fotográfica": {
            "nome": "Câmera Fotográfica",
            "categoria": "ARTESANATO",
            "preco_min": 26.33,
            "preco_max": 39,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "bonecas": {
            "nome": "Bonecas",
            "categoria": "ARTESANATO",
            "preco_min": 8.45,
            "preco_max": 12.65,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "orelhas": {
            "nome": "Orelhas",
            "categoria": "ARTESANATO",
            "preco_min": 8.45,
            "preco_max": 12.67,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "picareta_super_avançada": {
            "nome": "Picareta Super Avançada",
            "categoria": "ARTESANATO",
            "preco_min": 10.78,
            "preco_max": 16.17,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "caixa_rustica": {
            "nome": "Caixa Rustica",
            "categoria": "ARTESANATO",
            "preco_min": 0.5,
            "preco_max": 0.5,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "pá_de_escavação_profissional": {
            "nome": "Pá de escavação profissional",
            "categoria": "ARTESANATO",
            "preco_min": 8.52,
            "preco_max": 12.75,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "bandagem": {
            "nome": "Bandagem",
            "categoria": "MEDICOS",
            "preco_min": 0,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "antibiotico": {
            "nome": "Antibiotico",
            "categoria": "MEDICOS",
            "preco_min": 0,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "seringa_medica": {
            "nome": "Seringa Medica",
            "categoria": "MEDICOS",
            "preco_min": 0,
            "preco_max": 20,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "antídoto_de_cobra": {
            "nome": "Antídoto de cobra",
            "categoria": "MEDICOS",
            "preco_min": 0,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "comida_para_treinamento": {
            "nome": "Comida para treinamento",
            "categoria": "MEDICOS",
            "preco_min": 3.8,
            "preco_max": 5,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "apito": {
            "nome": "APITO",
            "categoria": "MEDICOS",
            "preco_min": 23.1,
            "preco_max": 30.8,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "remedio_canino_drauzio": {
            "nome": "Remedio Canino Drauzio",
            "categoria": "MEDICOS",
            "preco_min": 1.44,
            "preco_max": 1.92,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "cantil_canino_drauzio": {
            "nome": "Cantil Canino Drauzio",
            "categoria": "MEDICOS",
            "preco_min": 1.73,
            "preco_max": 2.3,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "petisco_premium": {
            "nome": "Petisco Premium",
            "categoria": "MEDICOS",
            "preco_min": 3.8,
            "preco_max": 5,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "guacamole": {
            "nome": "Guacamole",
            "categoria": "DOCERIA",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "café_com_leite": {
            "nome": "Café com leite",
            "categoria": "DOCERIA",
            "preco_min": 0.94,
            "preco_max": 1.41,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "suco_de_frutas": {
            "nome": "Suco de frutas",
            "categoria": "DOCERIA",
            "preco_min": 0.76,
            "preco_max": 1.15,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "taco_mexicano": {
            "nome": "Taco Mexicano",
            "categoria": "DOCERIA",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "bolo_de_pimenta": {
            "nome": "Bolo de Pimenta",
            "categoria": "DOCERIA",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "torta_de_frutas": {
            "nome": "Torta de frutas",
            "categoria": "DOCERIA",
            "preco_min": 0.69,
            "preco_max": 1.05,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "vodka_1": {
            "nome": "Vodka",
            "categoria": "DOCERIA",
            "preco_min": 0.75,
            "preco_max": 1.25,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "sorvete_de_casquinha": {
            "nome": "Sorvete de Casquinha",
            "categoria": "DOCERIA",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "cupcake": {
            "nome": "Cupcake",
            "categoria": "DOCERIA",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "rosquinhas": {
            "nome": "Rosquinhas",
            "categoria": "DOCERIA",
            "preco_min": 0.85,
            "preco_max": 1.27,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "algodão_doce": {
            "nome": "Algodão Doce",
            "categoria": "DOCERIA",
            "preco_min": 0.72,
            "preco_max": 1.08,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "diagrama_de_pistola": {
            "nome": "Diagrama de Pistola",
            "categoria": "GRAFICA",
            "preco_min": 7.8,
            "preco_max": 11.7,
            "atualizado_em": "2025-08-24T05:18:16.373Z"
          },
          "diagrama_de_repetidora": {
            "nome": "Diagrama de Repetidora",
            "categoria": "GRAFICA",
            "preco_min": 7.88,
            "preco_max": 11.82,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "diagrama_de_revólver": {
            "nome": "Diagrama de Revólver",
            "categoria": "GRAFICA",
            "preco_min": 1.43,
            "preco_max": 2.15,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "diagrama_de_rifle": {
            "nome": "Diagrama de Rifle",
            "categoria": "GRAFICA",
            "preco_min": 4.88,
            "preco_max": 7.32,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "diagrama_de_shotgun": {
            "nome": "Diagrama de Shotgun",
            "categoria": "GRAFICA",
            "preco_min": 11.77,
            "preco_max": 17.65,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "diagrama_de_munição": {
            "nome": "Diagrama de Munição",
            "categoria": "GRAFICA",
            "preco_min": 0.46,
            "preco_max": 0.7,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "manual_da_cruza": {
            "nome": "Manual da Cruza",
            "categoria": "GRAFICA",
            "preco_min": 1500,
            "preco_max": 1500,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "munição_de_repetição_expressa": {
            "nome": "Munição de Repetição Expressa",
            "categoria": "MUNICAO_ESPECIAL",
            "preco_min": 12.38,
            "preco_max": 15.89,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "munição_de_revólver_expressa": {
            "nome": "Munição de Revólver Expressa",
            "categoria": "MUNICAO_ESPECIAL",
            "preco_min": 7.92,
            "preco_max": 10.5,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "munição_de_pistola_expressa": {
            "nome": "Munição de Pistola Expressa",
            "categoria": "MUNICAO_ESPECIAL",
            "preco_min": 8.84,
            "preco_max": 11.78,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "munição_de_rifle_expressa": {
            "nome": "Munição de Rifle Expressa",
            "categoria": "MUNICAO_ESPECIAL",
            "preco_min": 12.68,
            "preco_max": 15.89,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "munição_de_rifle_de_velocidade": {
            "nome": "Munição de Rifle de Velocidade",
            "categoria": "MUNICAO_ESPECIAL",
            "preco_min": 7.67,
            "preco_max": 10.25,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "munição_de_repetição_de_velocidade": {
            "nome": "Munição de Repetição de Velocidade",
            "categoria": "MUNICAO_ESPECIAL",
            "preco_min": 4.79,
            "preco_max": 6.38,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "munição_de_revólver_de_velocidade": {
            "nome": "Munição de Revólver de Velocidade",
            "categoria": "MUNICAO_ESPECIAL",
            "preco_min": 3.83,
            "preco_max": 5.11,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "pão_com_manteiga": {
            "nome": "Pão Com Manteiga",
            "categoria": "PADARIA",
            "preco_min": 0.49,
            "preco_max": 0.73,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "café_com_leite_1": {
            "nome": "Café com leite",
            "categoria": "PADARIA",
            "preco_min": 0.72,
            "preco_max": 1.1,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "torta_de_frutas_1": {
            "nome": "Torta de frutas",
            "categoria": "PADARIA",
            "preco_min": 0.49,
            "preco_max": 0.73,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "suco_de_frutas_1": {
            "nome": "Suco de frutas",
            "categoria": "PADARIA",
            "preco_min": 0.46,
            "preco_max": 0.7,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "chocolate_amargo": {
            "nome": "Chocolate Amargo",
            "categoria": "PADARIA",
            "preco_min": 0.59,
            "preco_max": 0.89,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "chocolate_quentinho": {
            "nome": "Chocolate Quentinho",
            "categoria": "PADARIA",
            "preco_min": 0.59,
            "preco_max": 0.88,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "bolo_com_pimenta": {
            "nome": "Bolo com Pimenta",
            "categoria": "PADARIA",
            "preco_min": 0.5,
            "preco_max": 0.7,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "placa_de_arma": {
            "nome": "Placa de arma",
            "categoria": "CAVALARIA",
            "preco_min": 50,
            "preco_max": 50,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "escolta_particular": {
            "nome": "Escolta particular",
            "categoria": "CAVALARIA",
            "preco_min": 200,
            "preco_max": 0,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "espelho_gourmet": {
            "nome": "Espelho Gourmet",
            "categoria": "ATELIE",
            "preco_min": 10,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.374Z"
          },
          "blush_gourmet": {
            "nome": "Blush Gourmet",
            "categoria": "ATELIE",
            "preco_min": 10,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "deliniador_gourmet": {
            "nome": "Deliniador Gourmet",
            "categoria": "ATELIE",
            "preco_min": 10,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "batom_gourmet": {
            "nome": "Batom Gourmet",
            "categoria": "ATELIE",
            "preco_min": 10,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "sombra_gourmet": {
            "nome": "Sombra Gourmet",
            "categoria": "ATELIE",
            "preco_min": 10,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "pomada_capilar": {
            "nome": "Pomada Capilar",
            "categoria": "ATELIE",
            "preco_min": 15,
            "preco_max": 18,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "outfit_pronto": {
            "nome": "Outfit Pronto",
            "categoria": "ATELIE",
            "preco_min": 100,
            "preco_max": 150,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "item_outfit": {
            "nome": "Item Outfit",
            "categoria": "ATELIE",
            "preco_min": 100,
            "preco_max": 150,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "toalha": {
            "nome": "Toalha",
            "categoria": "ATELIE",
            "preco_min": 3,
            "preco_max": 5,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "posters": {
            "nome": "Posters",
            "categoria": "JORNAL",
            "preco_min": 5,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "seda": {
            "nome": "Seda",
            "categoria": "JORNAL",
            "preco_min": 0.52,
            "preco_max": 1.04,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "impressao_-_materias": {
            "nome": "Impressao - materias",
            "categoria": "JORNAL",
            "preco_min": 5,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "rótulo_1": {
            "nome": "Rótulo",
            "categoria": "JORNAL",
            "preco_min": 0.48,
            "preco_max": 0.73,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "mural": {
            "nome": "Mural",
            "categoria": "JORNAL",
            "preco_min": 10,
            "preco_max": 15,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "lampião_a_gás": {
            "nome": "Lampião a Gás",
            "categoria": "JORNAL",
            "preco_min": 30,
            "preco_max": 40,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "lanterna_davy": {
            "nome": "Lanterna davy",
            "categoria": "JORNAL",
            "preco_min": 30,
            "preco_max": 40,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "madeira_lapidada": {
            "nome": "Madeira Lapidada",
            "categoria": "MADEIREIRA",
            "preco_min": 0.45,
            "preco_max": 0.67,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "madeira_cubica": {
            "nome": "Madeira Cubica",
            "categoria": "MADEIREIRA",
            "preco_min": 0.9,
            "preco_max": 1.35,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "serra_serra": {
            "nome": "Serra Serra",
            "categoria": "MADEIREIRA",
            "preco_min": 0.6,
            "preco_max": 0.89,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "madeira_cilindrica": {
            "nome": "Madeira Cilindrica",
            "categoria": "MADEIREIRA",
            "preco_min": 0.39,
            "preco_max": 0.58,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "machado_reforçado": {
            "nome": "Machado Reforçado",
            "categoria": "MADEIREIRA",
            "preco_min": 5,
            "preco_max": 6,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "carvão_vegetal": {
            "nome": "Carvão Vegetal",
            "categoria": "MADEIREIRA",
            "preco_min": 1,
            "preco_max": 1,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "charuto": {
            "nome": "Charuto",
            "categoria": "TABACARIA",
            "preco_min": 1.63,
            "preco_max": 2.45,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "pipe": {
            "nome": "Pipe",
            "categoria": "TABACARIA",
            "preco_min": 1.95,
            "preco_max": 2.92,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "cigarro": {
            "nome": "Cigarro",
            "categoria": "TABACARIA",
            "preco_min": 0.69,
            "preco_max": 1.03,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "goma_de_tabaco": {
            "nome": "Goma de tabaco",
            "categoria": "TABACARIA",
            "preco_min": 0.69,
            "preco_max": 1.03,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "qualquer_minério": {
            "nome": "Qualquer Minério",
            "categoria": "MINERADORA",
            "preco_min": 0.3,
            "preco_max": 0.45,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "mangânes": {
            "nome": "Mangânes",
            "categoria": "MINERADORA",
            "preco_min": 0.3,
            "preco_max": 0,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "lascas_de_platina": {
            "nome": "Lascas de Platina",
            "categoria": "MINERADORA",
            "preco_min": 1,
            "preco_max": 1.5,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "pacote_de_minerio": {
            "nome": "Pacote de Minerio",
            "categoria": "MINERADORA",
            "preco_min": 2,
            "preco_max": 2,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "fogueira_(campfire)": {
            "nome": "Fogueira (campfire)",
            "categoria": "INDIGENAS",
            "preco_min": 15,
            "preco_max": 20,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "tomahawk_pct_(3x)": {
            "nome": "Tomahawk pct (3x)",
            "categoria": "INDIGENAS",
            "preco_min": 7,
            "preco_max": 10,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "tomahawk": {
            "nome": "Tomahawk",
            "categoria": "INDIGENAS",
            "preco_min": 22.29,
            "preco_max": 29.72,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "tocha": {
            "nome": "Tocha",
            "categoria": "INDIGENAS",
            "preco_min": 6.15,
            "preco_max": 8.2,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "flecha_normal": {
            "nome": "Flecha Normal",
            "categoria": "INDIGENAS",
            "preco_min": 3.25,
            "preco_max": 4.33,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "arco_simples": {
            "nome": "Arco Simples",
            "categoria": "INDIGENAS",
            "preco_min": 23.25,
            "preco_max": 30,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "laço_reforçado": {
            "nome": "Laço Reforçado",
            "categoria": "INDIGENAS",
            "preco_min": 15,
            "preco_max": 20,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          },
          "libid_gel_equino": {
            "nome": "Libid Gel Equino",
            "categoria": "INDIGENAS",
            "preco_min": 80,
            "preco_max": 80,
            "atualizado_em": "2025-08-24T05:18:16.375Z"
          }
        }
      };
      setPriceData(completeData);
      setError(null);
    } catch (error) {
      console.error('Error loading price data:', error);
      setError('Erro ao carregar lista de preços');
    } finally {
      setLoading(false);
    }
  };

  const syncWithGoogleSheets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock sync call - replace with actual API call
      // const response = await fetch('/api/precos/sync');
      // const data = await response.json();
      
      // Mock response
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      // Reload the data after sync
      await loadPriceData();
      
      console.log('✅ Preços sincronizados com Google Sheets');
    } catch (error) {
      console.error('Error syncing prices:', error);
      setError('Erro ao sincronizar com Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort items
  const getFilteredAndSortedItems = () => {
    const items = Object.entries(priceData.itens).map(([id, item]) => ({
      id,
      ...item,
      displayName: item.nome || normalizeText(id),
      categoria: item.categoria || getCategoryForItem(item.nome || id),
      precoMedio: (item.preco_min + item.preco_max) / 2
    }));

    let filtered = items;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.displayName.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower) ||
        (categories[item.categoria as keyof typeof categories] || '').toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (selectedCategory !== 'todos') {
      filtered = filtered.filter(item => item.categoria === selectedCategory);
    }

    // Sort items
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'preco_min':
          aValue = a.preco_min;
          bValue = b.preco_min;
          break;
        case 'preco_max':
          aValue = a.preco_max;
          bValue = b.preco_max;
          break;
        case 'preco_medio':
          aValue = a.precoMedio;
          bValue = b.precoMedio;
          break;
        case 'categoria':
          aValue = categories[a.categoria as keyof typeof categories] || 'Outros';
          bValue = categories[b.categoria as keyof typeof categories] || 'Outros';
          break;
        case 'nome':
        default:
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return filtered;
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

  // Utility functions
  const normalizeText = (text: string) => {
    if (!text) return 'Item';
    
    return text
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getCategoryForItem = (itemName: string) => {
    const name = itemName.toLowerCase();
    
    if (name.includes('seed') || name.includes('semente') || name.includes('milho') || name.includes('trigo') || name.includes('junco')) {
      return 'sementes';
    }
    if (name.includes('racao') || name.includes('feed')) {
      return 'racoes';
    }
    if (name.includes('cow') || name.includes('pig') || name.includes('chicken') || name.includes('animal')) {
      return 'animais';
    }
    if (name.includes('milk') || name.includes('leite') || name.includes('water') || name.includes('juice')) {
      return 'bebidas';
    }
    if (name.includes('bread') || name.includes('food') || name.includes('meat') || name.includes('carne') || name.includes('egg')) {
      return 'comidas';
    }
    if (name.includes('tool') || name.includes('ferramenta') || name.includes('hoe') || name.includes('moedor')) {
      return 'ferramentas';
    }
    if (name.includes('produto') || name.includes('product') || name.includes('caixa') || name.includes('box') || name.includes('saco')) {
      return 'produtos';
    }
    if (name.includes('wood') || name.includes('ferro') || name.includes('material') || name.includes('carvao') || name.includes('metal')) {
      return 'materiais';
    }
    if (name.includes('plant') || name.includes('planta') || name.includes('flower')) {
      return 'plantas';
    }
    
    return 'outros';
  };

  const getCategoryColor = (categoria: string) => {
    switch (categoria) {
      case 'plantas': return 'bg-green-100 text-green-800';
      case 'sementes': return 'bg-yellow-100 text-yellow-800';
      case 'racoes': return 'bg-orange-100 text-orange-800';
      case 'comidas': return 'bg-red-100 text-red-800';
      case 'bebidas': return 'bg-blue-100 text-blue-800';
      case 'animais': return 'bg-pink-100 text-pink-800';
      case 'materiais': return 'bg-gray-100 text-gray-800';
      case 'ferramentas': return 'bg-indigo-100 text-indigo-800';
      case 'produtos': return 'bg-purple-100 text-purple-800';
      case 'consumeveis': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Get sort icon
  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('todos');
    setCurrentPage(1);
  };

  // Dialog handlers
  const handleOpenDialog = (itemId?: string) => {
    if (itemId && priceData.itens[itemId]) {
      const item = priceData.itens[itemId];
      setEditingItem(itemId);
      setFormData({
        id: itemId,
        nome: item.nome,
        preco_min: item.preco_min,
        preco_max: item.preco_max,
        categoria: item.categoria || 'outros'
      });
    } else {
      setEditingItem(null);
      setFormData({
        id: '',
        nome: '',
        preco_min: 0,
        preco_max: 0,
        categoria: 'outros'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
  };

  const handleSaveItem = () => {
    if (!formData.nome || formData.preco_min < 0 || formData.preco_max < 0 || formData.preco_max < formData.preco_min) {
      setError('Dados inválidos. Verifique os campos.');
      return;
    }

    const newItem: PriceItem = {
      nome: formData.nome,
      preco_min: formData.preco_min,
      preco_max: formData.preco_max,
      categoria: formData.categoria,
      atualizado_em: new Date().toISOString()
    };

    if (!editingItem) {
      newItem.criado_em = new Date().toISOString();
    }

    const itemId = editingItem || formData.id || formData.nome.toLowerCase().replace(/\s+/g, '_');
    
    setPriceData(prev => ({
      ...prev,
      itens: {
        ...prev.itens,
        [itemId]: newItem
      }
    }));

    handleCloseDialog();
    setError(null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('Tem certeza que deseja remover este item?')) {
      setPriceData(prev => {
        const newItens = { ...prev.itens };
        delete newItens[itemId];
        return { ...prev, itens: newItens };
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const { items: paginatedItems, totalItems, totalPages } = getPaginatedItems();

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6" />
            Lista de Preços
          </h2>
          <div className="flex gap-3">
            <button
              onClick={syncWithGoogleSheets}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
            <button
              onClick={() => handleOpenDialog()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo Item
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
            {error}
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Pesquisar itens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="todos">Todas Categorias</option>
                {Object.entries(categories).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </button>
          </div>

          <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
            <span>{totalItems} itens encontrados</span>
            {(searchTerm || selectedCategory !== 'todos') && (
              <span>Filtros ativos</span>
            )}
          </div>
        </div>

        {/* Price List Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('nome')}
                  >
                    <div className="flex items-center gap-1">
                      Nome do Item
                      {getSortIcon('nome')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('categoria')}
                  >
                    <div className="flex items-center gap-1">
                      Categoria
                      {getSortIcon('categoria')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('preco_min')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Preço Min
                      {getSortIcon('preco_min')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('preco_max')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Preço Max
                      {getSortIcon('preco_max')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('preco_medio')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Preço Médio
                      {getSortIcon('preco_medio')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || selectedCategory !== 'todos' 
                        ? 'Nenhum item encontrado para os filtros aplicados' 
                        : 'Nenhum item na lista de preços'}
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.displayName}</div>
                          <div className="text-xs text-gray-500">ID: {item.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.categoria)}`}>
                          {categories[item.categoria as keyof typeof categories] || 'Outros'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                        ${item.preco_min.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                        ${item.preco_max.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-600 font-semibold">
                        ${item.precoMedio.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDialog(item.id)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Página {currentPage} de {totalPages} ({totalItems} itens)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Item Dialog */}
      {openDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </h3>

              <div className="space-y-4">
                {!editingItem && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID do Item</label>
                    <input
                      type="text"
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="ex: milho, trigo, etc."
                    />
                    <p className="text-xs text-gray-500 mt-1">Deixe vazio para gerar automaticamente</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Item</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {Object.entries(categories).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço Mínimo ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco_min}
                      onChange={(e) => setFormData({ ...formData, preco_min: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço Máximo ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco_max}
                      onChange={(e) => setFormData({ ...formData, preco_max: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                </div>

                {formData.preco_min > 0 && formData.preco_max > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Preço Médio:</strong> ${((formData.preco_min + formData.preco_max) / 2).toFixed(2)}
                    </p>
                    {formData.preco_max < formData.preco_min && (
                      <p className="text-sm text-red-600 mt-1">
                        ⚠️ Preço máximo deve ser maior que o mínimo
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCloseDialog}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={!formData.nome || formData.preco_min < 0 || formData.preco_max < 0 || formData.preco_max < formData.preco_min}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingItem ? 'Atualizar' : 'Criar'} Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceList;