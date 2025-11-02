export interface TicketReply {
  id: string;
  userId: string;
  userName: string;
  userType: 'customer' | 'admin';
  content: string;
  createdAt: string;
  isInternal: boolean;
}

export interface TicketDetail {
  id: string;
  ticketNo: string;
  title: string;
  content: string;
  category: 'technical' | 'billing' | 'account' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}
