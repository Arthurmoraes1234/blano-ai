export interface Subscription {
  id: string; // stripe subscription id
  user_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  plan_id: string; // stripe price id
  current_period_end: string; // ISO string date
  trial_start?: string;
  trial_end?: string;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'owner' | 'designer';
  id_agencia: number | null;
  monthly_project_count?: number; // Usage counter
  subscription?: Subscription | null; // From the new 'subscriptions' table
}

export interface Agency {
  id: number;
  ownerId: string; // Corrigido de id_dono
  name: string;
  brandName: string; // Corrigido de nomeMarca
  brandLogo: string; // Corrigido de logoMarca
  team: string[];
  created_at: string;
}

export enum ProjectStatus {
  Briefing = 'Briefing',
  Producing = 'Produzindo',
  Approval = 'Aprovação',
  Adjustments = 'Ajustes',
  Posted = 'Postado',
}

export interface ContentPiece {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  caption: string;
  imagePrompt: string;
  status: 'pending' | 'approved' | 'adjust' | 'posted';
  feedback?: string;
  finalArtUrl?: string;
}

export interface Project {
  id: number;
  id_agencia: number;
  euIa: string; // ID do usuário criador (Corrigido de eu_ia)
  nome: string;
  cliente: string;
  status: ProjectStatus;
  created_at: string; // ISO string date
  data_entrega?: Date | string;
  data_conclusao?: Date | string;
  tags?: string[];
  pecas_conteudo: ContentPiece[];
  pecas_carrossel?: ContentPiece[];
  link_instagram?: string;
  link_google_drive?: string;
  link_referencia?: string;
  tom_de_voz: string;
  persona: string;
  calendario_publicacao: string;
  segment: string;
  objective: string;
  canais: string[];
}

export interface Invoice {
  id: number;
  id_agencia: number;
  created_at: string;
  nome_cliente: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  data_vencimento: string | Date;
}

export interface Expense {
  id: number;
  id_agencia: number;
  created_at: string;
  description: string;
  amount: number;
  category: string;
  date: string | Date;
}

export interface Invitation {
  id: number;
  id_agencia: number;
  nome_agencia: string;
  emailDesigner: string; // Corrigido de email_designer
  created_at: string;
}

export interface Notification {
  id: number;
  idAgencia: number; // Corrigido de id_agencia
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  link?: string;
  lido: boolean;
  created_at: string;
}

export interface DataContextType {
  agency: Agency | null;
  projects: Project[];
  invoices: Invoice[];
  expenses: Expense[];
  invitations: Invitation[];
  notifications: Notification[];
  loading: boolean;
  markAllNotificationsAsRead: () => Promise<void>;
  clearReadNotifications: () => Promise<void>;
  addInvoice: (data: Omit<Invoice, 'id' | 'id_agencia' | 'created_at'>) => Promise<void>;
  updateInvoice: (invoiceId: number, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (invoiceId: number) => Promise<void>;
  addExpense: (data: Omit<Expense, 'id' | 'id_agencia' | 'created_at'>) => Promise<void>;
  updateExpense: (expenseId: number, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: number) => Promise<void>;
  updateProject: (projectId: number, data: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: number) => Promise<void>;
}