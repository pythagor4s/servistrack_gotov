import type { ComponentType, SVGProps } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Add01Icon,
  Alert02Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowDownAZIcon,
  ArrowDownWideNarrowIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpWideNarrowIcon,
  ArrowUpZAIcon,
  Briefcase01Icon,
  Building03Icon,
  Calendar03Icon,
  Call02Icon,
  CancelCircleIcon,
  Cancel01Icon,
  ChartNoAxesGanttIcon,
  CheckmarkCircle02Icon,
  CircleDotIcon,
  CircleIcon,
  Clock01Icon,
  ComputerIcon,
  ComputerPhoneSyncIcon,
  DashedLineCircleIcon,
  ExclamationMarkBigIcon,
  ExclamationMarkBigSlashIcon,
  Delete02Icon,
  Download01Icon,
  File01Icon,
  Pdf02Icon,
  HashIcon,
  FilterHorizontalIcon,
  GridViewIcon,
  HelpCircleIcon,
  ImageNotFound01Icon,
  InformationCircleIcon,
  Key01Icon,
  Layers01Icon,
  LeftToRightListBulletIcon,
  MinusSignIcon,
  Activity01Icon,
  Link02Icon,
  Location01Icon,
  Logout01Icon,
  Mail01Icon,
  Message01Icon,
  MoreHorizontalIcon,
  NetworkIcon,
  NoteEditIcon,
  PencilEdit01Icon,
  PinIcon,
  QrCodeIcon,
  RefreshCwIcon,
  RepeatIcon,
  RotateCcwIcon,
  Search01Icon,
  Settings01Icon,
  Settings02Icon,
  ShapesIcon,
  Shield01Icon,
  SourceCodeIcon,
  SquareLock02Icon,
  TagsIcon,
  TextBoldIcon,
  TextItalicIcon,
  Tick02Icon,
  Upload01Icon,
  UserIcon,
  UserShield01Icon,
  ViewIcon,
  ViewOffIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import {
  ArrowUpRight01Icon,
  BookOpen01Icon,
  BugIcon,
  Copy01Icon,
  DropletIcon,
  Fan01Icon,
  FlashIcon,
  ForkliftIcon,
  GaugeIcon,
  GearsIcon,
  KeyboardIcon,
  MagnetIcon,
  Package01Icon,
  PaintBoardIcon,
  Radar01Icon,
  RouterIcon,
  ScissorIcon,
  ScrollIcon,
  SoftwareIcon,
  StethoscopeIcon,
  Tag01Icon,
  ThermometerWarmIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  ToolsIcon,
  UvIcon,
  Target02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

export const STROKE = 1.75;

export type IconComponent = ComponentType<Omit<SVGProps<SVGSVGElement>, "ref">>;

function icon(data: IconSvgElement, name: string): IconComponent {
  function Icon({ strokeWidth, ...props }: Omit<SVGProps<SVGSVGElement>, "ref">) {
    return (
      <HugeiconsIcon
        icon={data}
        aria-hidden={props["aria-label"] ? undefined : true}
        strokeWidth={strokeWidth === undefined ? STROKE : Number(strokeWidth)}
        {...props}
      />
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const CLIPBOARD_BOARD =
  "M9.55 4H8C6.46 4.05 5.52 4.23 4.88 4.88C4 5.76 4 7.17 4 10V16C4 18.83 4 20.24 4.88 21.12C5.76 22 7.17 22 10 22H14C16.83 22 18.24 22 19.12 21.12C20 20.24 20 18.83 20 16V10C20 7.17 20 5.76 19.12 4.88C18.48 4.23 17.54 4.05 16 4H14.45";
export const CLIPBOARD_RING = "M14.45 4C14.22 2.86 13.21 2 12 2C10.79 2 9.78 2.86 9.55 4";
export const CLIPBOARD_TAB =
  "M8 4V5C8 5.94 8 6.41 8.29 6.71C8.59 7 9.06 7 10 7H14C14.94 7 15.41 7 15.71 6.71C16 6.41 16 5.94 16 5V4";
export const CLIPBOARD_ROWS = [
  { dot: "M8 12H8.01", line: "M12 12H16" },
  { dot: "M8 17H8.01", line: "M12 17H16" },
] as const;

const stroke = { stroke: "currentColor", strokeWidth: STROKE, strokeLinecap: "round", strokeLinejoin: "round" };
const CLIPBOARD_FRAME: IconSvgElement = [
  ["path", { d: CLIPBOARD_BOARD, ...stroke, key: "board" }],
  ["path", { d: CLIPBOARD_RING, ...stroke, key: "ring" }],
  ["path", { d: CLIPBOARD_TAB, ...stroke, key: "tab" }],
];

export const ClipboardList = icon(
  [
    ...CLIPBOARD_FRAME,
    ...CLIPBOARD_ROWS.flatMap((r, i): IconSvgElement => [
      ["path", { d: r.dot, ...stroke, key: `dot${i}` }],
      ["path", { d: r.line, ...stroke, key: `line${i}` }],
    ]),
  ],
  "ClipboardList",
);

export const AlertTriangle = icon(Alert02Icon, "AlertTriangle");
export const TriangleAlertIcon = AlertTriangle;
export const ArrowDownAZ = icon(ArrowDownAZIcon, "ArrowDownAZ");
export const ArrowUpAZ = icon(ArrowUpZAIcon, "ArrowUpAZ");
export const ArrowDownWideNarrow = icon(ArrowDownWideNarrowIcon, "ArrowDownWideNarrow");
export const ArrowUpWideNarrow = icon(ArrowUpWideNarrowIcon, "ArrowUpWideNarrow");
export const SortAlpha = icon(ArrowDownAZIcon, "SortAlpha");
export const Bold = icon(TextBoldIcon, "Bold");
export const Building2 = icon(Building03Icon, "Building2");
export const CalendarDays = icon(Calendar03Icon, "CalendarDays");
export const ChartNoAxesGantt = icon(ChartNoAxesGanttIcon, "ChartNoAxesGantt");
export const Check = icon(Tick02Icon, "Check");
export const CheckCircle2 = icon(CheckmarkCircle02Icon, "CheckCircle2");
export const CircleCheckIcon = CheckCircle2;
export const ChevronDown = icon(ArrowDown01Icon, "ChevronDown");
export const ChevronLeft = icon(ArrowLeft01Icon, "ChevronLeft");
export const ChevronRight = icon(ArrowRight01Icon, "ChevronRight");
export const ChevronUp = icon(ArrowUp01Icon, "ChevronUp");
export const Circle = icon(CircleIcon, "Circle");
export const CircleAlert = icon(AlertCircleIcon, "CircleAlert");
export const CircleDashed = icon(DashedLineCircleIcon, "CircleDashed");
export const CircleDot = icon(CircleDotIcon, "CircleDot");
export const CircleHelp = icon(HelpCircleIcon, "CircleHelp");
export const Clock = icon(Clock01Icon, "Clock");
export const Code = icon(SourceCodeIcon, "Code");
export const Cog = icon(Settings02Icon, "Cog");
export const Download = icon(Download01Icon, "Download");
export const Ellipsis = icon(MoreHorizontalIcon, "Ellipsis");
export const Eye = icon(ViewIcon, "Eye");
export const EyeOff = icon(ViewOffIcon, "EyeOff");
export const ExclamationMark = icon(ExclamationMarkBigIcon, "ExclamationMark");
export const ExclamationMarkSlash = icon(ExclamationMarkBigSlashIcon, "ExclamationMarkSlash");
export const FileText = icon(File01Icon, "FileText");
export const FilePdf = icon(Pdf02Icon, "FilePdf");
export const Hash = icon(HashIcon, "Hash");
export const ImageOff = icon(ImageNotFound01Icon, "ImageOff");
export const Info = icon(InformationCircleIcon, "Info");
export const InfoIcon = Info;
export const Italic = icon(TextItalicIcon, "Italic");
export const KeyRound = icon(Key01Icon, "KeyRound");
export const Layers = icon(Layers01Icon, "Layers");
export const LayoutGrid = icon(GridViewIcon, "LayoutGrid");
export const LayoutList = icon(Briefcase01Icon, "LayoutList");
export const Link2 = icon(Link02Icon, "Link2");
export const List = icon(LeftToRightListBulletIcon, "List");
export const QrCode = icon(QrCodeIcon, "QrCode");
export const Lock = icon(SquareLock02Icon, "Lock");
export const LogOut = icon(Logout01Icon, "LogOut");
export const Mail = icon(Mail01Icon, "Mail");
export const Minus = icon(MinusSignIcon, "Minus");
export const Activity = icon(Activity01Icon, "Activity");
export const MapPin = icon(Location01Icon, "MapPin");
export const MessageSquare = icon(Message01Icon, "MessageSquare");
export const Monitor = icon(ComputerIcon, "Monitor");
export const MonitorSmartphone = icon(ComputerPhoneSyncIcon, "MonitorSmartphone");
export const Network = icon(NetworkIcon, "Network");
export const NotebookPen = icon(NoteEditIcon, "NotebookPen");
export const OctagonXIcon = icon(CancelCircleIcon, "OctagonXIcon");
export const Pencil = icon(PencilEdit01Icon, "Pencil");
export const Phone = icon(Call02Icon, "Phone");
export const Pin = icon(PinIcon, "Pin");
export const Plus = icon(Add01Icon, "Plus");
export const RefreshCw = icon(RefreshCwIcon, "RefreshCw");
export const Repeat = icon(RepeatIcon, "Repeat");
export const RotateCcw = icon(RotateCcwIcon, "RotateCcw");
export const Search = icon(Search01Icon, "Search");
export const Settings = icon(Settings01Icon, "Settings");
export const Shapes = icon(ShapesIcon, "Shapes");
export const Shield = icon(Shield01Icon, "Shield");
export const ShieldUser = icon(UserShield01Icon, "ShieldUser");
export const SlidersHorizontal = icon(FilterHorizontalIcon, "SlidersHorizontal");
export const Tags = icon(TagsIcon, "Tags");
export const Trash2 = icon(Delete02Icon, "Trash2");
export const Upload = icon(Upload01Icon, "Upload");
export const User = icon(UserIcon, "User");
export const UserRound = User;
export const Wrench = icon(Wrench01Icon, "Wrench");
export const X = icon(Cancel01Icon, "X");
export const XIcon = X;

export const Droplet = icon(DropletIcon, "Droplet");
export const PaintBoard = icon(PaintBoardIcon, "PaintBoard");
export const Scissors = icon(ScissorIcon, "Scissors");
export const Fan = icon(Fan01Icon, "Fan");
export const Gears = icon(GearsIcon, "Gears");
export const Flash = icon(FlashIcon, "Flash");
export const Thermometer = icon(ThermometerWarmIcon, "Thermometer");
export const Scroll = icon(ScrollIcon, "Scroll");
export const Software = icon(SoftwareIcon, "Software");
export const Router = icon(RouterIcon, "Router");
export const Tools = icon(ToolsIcon, "Tools");
export const Package = icon(Package01Icon, "Package");
export const Gauge = icon(GaugeIcon, "Gauge");
export const Radar = icon(Radar01Icon, "Radar");
export const Magnet = icon(MagnetIcon, "Magnet");
export const Forklift = icon(ForkliftIcon, "Forklift");
export const Uv = icon(UvIcon, "Uv");
export const Bug = icon(BugIcon, "Bug");
export const ThumbsUp = icon(ThumbsUpIcon, "ThumbsUp");
export const ThumbsDown = icon(ThumbsDownIcon, "ThumbsDown");
export const Stethoscope = icon(StethoscopeIcon, "Stethoscope");
export const Copy = icon(Copy01Icon, "Copy");
export const ArrowUpRight = icon(ArrowUpRight01Icon, "ArrowUpRight");
export const BookOpen = icon(BookOpen01Icon, "BookOpen");
export const Tag = icon(Tag01Icon, "Tag");
export const Keyboard = icon(KeyboardIcon, "Keyboard");
export const Target = icon(Target02Icon, "Target");
export const Sparkles = icon(SparklesIcon, "Sparkles");
