
export interface SubCategory {
  name: string;
  icon: string;
}

export interface CategoryWithSubcategories {
  name: string;
  icon: string;
  color: string;
  transaction_type: 'income' | 'expense';
  subcategories: SubCategory[];
}

export const defaultCategories: CategoryWithSubcategories[] = [
  // RECEITAS
  {
    name: 'Salário',
    icon: '💼',
    color: '#10B981',
    transaction_type: 'income',
    subcategories: [
      { name: 'Salário Principal', icon: '💼' },
      { name: '13º Salário', icon: '💰' },
      { name: 'Férias', icon: '🏖️' },
      { name: 'Horas Extras', icon: '⏰' },
      { name: 'Bonificações', icon: '🎁' }
    ]
  },
  {
    name: 'Freelance',
    icon: '💻',
    color: '#3B82F6',
    transaction_type: 'income',
    subcategories: [
      { name: 'Trabalho Freelance', icon: '💻' },
      { name: 'Consultoria', icon: '📋' },
      { name: 'Serviços', icon: '🔧' }
    ]
  },
  {
    name: 'Investimentos',
    icon: '📈',
    color: '#8B5CF6',
    transaction_type: 'income',
    subcategories: [
      { name: 'Dividendos', icon: '💎' },
      { name: 'Rendimentos', icon: '📊' },
      { name: 'Vendas de Ações', icon: '📈' },
      { name: 'Fundos', icon: '🏦' }
    ]
  },
  {
    name: 'Outros',
    icon: '💰',
    color: '#6B7280',
    transaction_type: 'income',
    subcategories: [
      { name: 'Vendas', icon: '🛒' },
      { name: 'Prêmios', icon: '🏆' },
      { name: 'Reembolsos', icon: '💳' }
    ]
  },

  // DESPESAS
  {
    name: 'Moradia',
    icon: '🏠',
    color: '#8B5CF6',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Aluguel/Financiamento', icon: '🏠' },
      { name: 'Condomínio', icon: '🏢' },
      { name: 'Energia Elétrica', icon: '⚡' },
      { name: 'Água e Esgoto', icon: '💧' },
      { name: 'Gás', icon: '🔥' },
      { name: 'Internet', icon: '🌐' },
      { name: 'Telefone Fixo', icon: '☎️' },
      { name: 'IPTU/Taxas', icon: '📋' }
    ]
  },
  {
    name: 'Alimentação',
    icon: '🍽️',
    color: '#EF4444',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Supermercado', icon: '🛒' },
      { name: 'Feira', icon: '🥕' },
      { name: 'Restaurante/Lanchonete', icon: '🍔' },
      { name: 'Delivery', icon: '🚚' },
      { name: 'Padaria', icon: '🥖' }
    ]
  },
  {
    name: 'Transporte',
    icon: '🚗',
    color: '#F59E0B',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Combustível', icon: '⛽' },
      { name: 'Transporte Público', icon: '🚌' },
      { name: 'Aplicativos (Uber, 99)', icon: '📱' },
      { name: 'Estacionamento', icon: '🅿️' },
      { name: 'Manutenção Veicular', icon: '🔧' },
      { name: 'Seguro Veicular', icon: '🛡️' },
      { name: 'IPVA/Licenciamento', icon: '📋' }
    ]
  },
  {
    name: 'Saúde',
    icon: '🏥',
    color: '#EF4444',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Plano de Saúde', icon: '🏥' },
      { name: 'Medicamentos', icon: '💊' },
      { name: 'Consultas/Exames', icon: '👨‍⚕️' },
      { name: 'Terapias/Psicólogo', icon: '🧠' },
      { name: 'Emergências', icon: '🚑' }
    ]
  },
  {
    name: 'Educação',
    icon: '📚',
    color: '#3B82F6',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Mensalidade Escolar/Universitária', icon: '🎓' },
      { name: 'Cursos/Certificações', icon: '📜' },
      { name: 'Material Didático', icon: '📝' },
      { name: 'Livros', icon: '📚' }
    ]
  },
  {
    name: 'Lazer e Cultura',
    icon: '🎭',
    color: '#F59E0B',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Viagens', icon: '✈️' },
      { name: 'Cinema/Teatro', icon: '🎬' },
      { name: 'Streaming (Netflix, Spotify)', icon: '📺' },
      { name: 'Eventos', icon: '🎪' },
      { name: 'Hobbies', icon: '🎨' }
    ]
  },
  {
    name: 'Vestuário e Beleza',
    icon: '👗',
    color: '#EC4899',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Roupas/Calçados', icon: '👕' },
      { name: 'Cabelereiro/Barbearia', icon: '💇' },
      { name: 'Estética', icon: '💅' },
      { name: 'Cosméticos', icon: '💄' }
    ]
  },
  {
    name: 'Despesas Pessoais',
    icon: '👤',
    color: '#6B7280',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Presentes', icon: '🎁' },
      { name: 'Doações', icon: '❤️' },
      { name: 'Assinaturas', icon: '📋' },
      { name: 'Pets', icon: '🐕' },
      { name: 'Academia', icon: '🏋️' }
    ]
  },
  {
    name: 'Impostos e Taxas',
    icon: '📊',
    color: '#DC2626',
    transaction_type: 'expense',
    subcategories: [
      { name: 'IRPF/DARFs', icon: '💼' },
      { name: 'Multas', icon: '⚠️' },
      { name: 'Custas Judiciais', icon: '⚖️' }
    ]
  },
  {
    name: 'Dívidas e Empréstimos',
    icon: '💳',
    color: '#DC2626',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Parcelas de Empréstimos', icon: '🏦' },
      { name: 'Financiamentos', icon: '🏠' },
      { name: 'Cartão de Crédito', icon: '💳' }
    ]
  },
  {
    name: 'Investimentos e Poupança',
    icon: '💰',
    color: '#059669',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Aportes em Investimentos', icon: '📈' },
      { name: 'Reserva de Emergência', icon: '🛡️' },
      { name: 'Previdência Privada', icon: '👴' }
    ]
  },
  {
    name: 'Outros',
    icon: '📋',
    color: '#6B7280',
    transaction_type: 'expense',
    subcategories: [
      { name: 'Categorias Personalizadas', icon: '⚙️' },
      { name: 'Despesas Extraordinárias', icon: '💥' }
    ]
  }
];
