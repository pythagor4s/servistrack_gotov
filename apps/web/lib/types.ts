import type {
  TicketStatus,
  TicketPriority,
  TicketType,
  NotificationChannel,
  DepartmentColor,
  Role,
  CalendarColor,
  RecurrenceUnit,
  FaultCategoryIcon,
  ExternalCodeKind,
} from "@servis-track/shared";

export type Department = {
  id: string;
  name: string;
  description: string | null;
  color: DepartmentColor;
  createdAt: string;
  _count?: { machines: number };
};

export type MachineType = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  _count?: { machines: number };
};

export type Machine = {
  id: string;
  brand: string;
  model: string;
  serialNo: string | null;
  departmentId: string | null;
  typeId: string | null;
  attachedToId: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  department?: Department | null;
  type?: MachineType | null;
  attachedTo?: { id: string; brand: string; model: string } | null;
  _count?: { tickets: number };
  hasImage?: boolean;
  imageUpdatedAt?: string | null;
  image?: { updatedAt: string } | null;
  openTicketCount?: number;
};

export type Servicer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  address: string | null;
  active: boolean;
  createdAt: string;
  _count?: { tickets: number };
};

export type UserImageRef = { updatedAt: string };

export type UserRef = {
  id: string;
  username: string;
  name: string | null;
  role: Role;
  phone: string | null;
  active: boolean;
  image?: UserImageRef | null;
};

export type AppUser = UserRef & {
  email: string | null;
  departmentId: string | null;
  department: { id: string; name: string; color: DepartmentColor } | null;
  hasImage: boolean;
  imageUpdatedAt: string | null;
};

export type Ticket = {
  id: string;
  number: number;
  title: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  departmentId: string | null;
  machineId: string | null;
  faultDate: string | null;
  reporterName: string | null;
  reporterId: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  assignedServicerId: string | null;
  externalId: string | null;
  externalSource: string | null;
  description: string | null;
  machineDown: boolean;
  workOrderNo: string | null;
  servicerEta: string | null;
  serviceCostCents: number | null;
  categoryId: string | null;
  externalRefs: ExternalRefs | null;
  createdAt: string;
  updatedAt: string;
  assignee?: UserRef | null;
  reporter?: UserRef | null;
  department?: Department | null;
  machine?: Machine | null;
  assignedServicer?: Servicer | null;
  category?: FaultCategoryRef | null;
};

export type ExternalRefs = {
  machineCode?: string;
  departmentCode?: string;
  categoryCode?: string;
  reporterWorkerNo?: string;
};

export type ExternalCode = {
  id: string;
  kind: ExternalCodeKind;
  code: string;
  label: string | null;
  machineId: string | null;
  departmentId: string | null;
  categoryId: string | null;
  userId: string | null;
  seenCount: number;
  lastSeenAt: string | null;
  machine: { id: string; brand: string; model: string } | null;
  department: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  user: { id: string; name: string | null; username: string } | null;
};

export type DeliveryAttempt = {
  id: string;
  attemptNumber: number;
  outcome: "SUCCESS" | "FAILURE";
  error: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type Notification = {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  status: "PENDING" | "DELIVERED" | "FAILED";
  attempts: number;
  audience: "SERVICER" | "STAFF" | "REPORTER" | "SYSTEM";
  createdAt: string;
  deliveryAttempts?: DeliveryAttempt[];
};

export type TicketComment = {
  id: string;
  body: string;
  authorId: string | null;
  author: (UserRef & { image?: { updatedAt: string } | null }) | null;
  createdAt: string;
};

export type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type TicketEvent = {
  id: string;
  from: TicketStatus | null;
  to: TicketStatus;
  actor?: { id: string; username: string; name: string | null } | null;
  createdAt: string;
};

export type TicketDetail = Omit<Ticket, "reporter"> & {
  reporter?: (UserRef & { email: string | null; notifyEmail: boolean }) | null;
  attachments: Attachment[];
  notifications: Notification[];
  comments: TicketComment[];
  events: TicketEvent[];
};

export type KnowledgeArticle = {
  id: string;
  title: string;
  body: string;
  type: TicketType;
  views: number;
  pinned: boolean;
  departmentId: string | null;
  machineId: string | null;
  machine?: { id: string; brand: string; model: string; serialNo: string | null } | null;
  ticketId: string | null;
  createdById: string | null;
  createdBy?: {
    id: string;
    username: string;
    name: string | null;
    image?: UserImageRef | null;
  } | null;
  ticket?: {
    id: string;
    reporterId: string | null;
    reporterName: string | null;
    reporter?: {
      id: string;
      username: string;
      name: string | null;
      image?: UserImageRef | null;
    } | null;
    machine?: { id: string; brand: string; model: string } | null;
    number?: number;
  } | null;
  department?: { id: string; name: string } | null;
  categoryId?: string | null;
  category?: FaultCategoryRef | null;
  tags?: string[];
  helpfulUp?: number;
  helpfulDown?: number;
  createdAt: string;
  updatedAt?: string;
};

export type FaultCategoryRef = { id: string; name: string; icon: FaultCategoryIcon };

export type FaultCategory = FaultCategoryRef & {
  description: string | null;
  sortOrder: number;
  _count?: { articles: number };
};

export type KbRange = [number, number];

export type KbMatchKind = "exact" | "prefix" | "synonym" | "fuzzy" | "related";
export type KbField = "title" | "tags" | "cause" | "context" | "body";

export type KbHitMatch = {
  term: string;
  kind: KbMatchKind;
  as: string;
  field: KbField;
};

export type KbHit = {
  id: string;
  score: number;
  relevance: number;
  matchPct: number;
  matchedTerms: number;
  queryTerms: number;
  title: KbRange[];
  snippet: { text: string; ranges: KbRange[]; clippedStart: boolean; clippedEnd: boolean };
  tags: string[];
  matched: KbHitMatch[];
  article: KnowledgeArticle;
  cause?: string | null;
};

export type KbFacetBucket = { value: string; count: number };

export type KbFacets = {
  category: KbFacetBucket[];
  type: KbFacetBucket[];
  source: KbFacetBucket[];
  department: KbFacetBucket[];
  machine: KbFacetBucket[];
  tag: KbFacetBucket[];
  pinned: number;
};

export type KbStats = {
  articles: number;
  categories: number;
  machines: number;
  views: number;
  fromTickets: number;
};

export type KbSearchResponse = {
  total: number;
  hits: KbHit[];
  facets: KbFacets;
  suggestion: string | null;
  areas?: { id: string; share: number }[];
  tickets?: KbSimilarTicket[];
  stats: KbStats;
  tookMs: number;
};

export type KbLink = {
  id: string;
  title: string;
  type: TicketType;
  createdAt: string;
  ticketId: string | null;
  category: FaultCategoryRef | null;
  machine: { id: string; brand: string; model: string } | null;
  ticket: { machine: { id: string; brand: string; model: string } | null } | null;
};

export type KnowledgeArticleDetail = KnowledgeArticle & {
  helpfulUp: number;
  helpfulDown: number;
  myFeedback: boolean | null;
  related: KbLink[];
  sameMachine: KbLink[];
};

export type KbCause = KbHit & { cause: string; sameMachine: boolean };

export type KbSimilarTicket = {
  id: string;
  number: number;
  title: string;
  resolution: string;
  resolvedAt: string | null;
  machine: { id: string; brand: string; model: string } | null;
  relevance: number;
  matchPct: number;
  matched: KbHitMatch[];
};

export type KbDiagnoseResponse = {
  categories: { id: string; share: number }[];
  causes: KbCause[];
  tickets: KbSimilarTicket[];
  suggestion: string | null;
  tookMs: number;
};

export type MachineServiceTicket = Pick<
  Ticket,
  "id" | "title" | "status" | "priority" | "resolution" | "createdAt" | "machineDown" | "serviceCostCents"
>;

export type MachineStats = {
  since: string;
  faults: number;
  stoppages: number;
  downtimeHours: number;
  costCents: number | null;
};

export type MachineDetail = Machine & { tickets: MachineServiceTicket[]; stats: MachineStats };

export function ticketLabel(
  t: {
    title: string;
    machine?: { brand: string; model: string } | null;
  },
  fallback?: string,
): string {
  const inside = t.machine ? `${t.machine.brand} ${t.machine.model}` : fallback;
  return inside ? `${t.title} (${inside})` : t.title;
}

export type CalendarCategory = {
  id: string;
  name: string;
  color: CalendarColor;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
};

export type CalendarPerson = {
  id: string;
  username: string;
  name: string | null;
  image?: UserImageRef | null;
};

export type CalendarTask = {
  id: string;
  title: string;
  notes: string | null;
  categoryId: string | null;
  machineId: string | null;
  servicerId: string | null;
  assigneeId: string | null;
  date: string;
  startMinute: number | null;
  endMinute: number | null;
  recurrenceUnit: RecurrenceUnit | null;
  recurrenceInterval: number;
  recurrenceUntil: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; color: CalendarColor } | null;
  machine: { id: string; brand: string; model: string; serialNo: string | null } | null;
  servicer: { id: string; name: string } | null;
  assignee: CalendarPerson | null;
  createdBy: CalendarPerson | null;
};

export type CalendarCompletionRef = {
  id: string;
  completedAt: string;
  completedBy: { id: string; username: string; name: string | null } | null;
};

export type CalendarOccurrence = {
  taskId: string;
  date: string;
  completion: CalendarCompletionRef | null;
};

export type CalendarTasksResponse = {
  tasks: CalendarTask[];
  occurrences: CalendarOccurrence[];
};
