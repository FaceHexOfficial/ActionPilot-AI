import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Settings, 
  Sparkles,
  Bot,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from './ui/dropdown-menu';
import TaskCreationModal from './TaskCreationModal';

interface LayoutProps {
  user: any;
}

export default function Layout({ user }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }

      if (e.key.toLowerCase() === 't') {
        navigate('/tasks');
      } else if (e.key.toLowerCase() === 'd') {
        navigate('/');
      } else if (e.key.toLowerCase() === 'c') {
        navigate('/calendar');
      } else if (e.key.toLowerCase() === 'n') {
        setIsTaskModalOpen(true);
        e.preventDefault();
      }
    };

    const handleOpenModal = () => setIsTaskModalOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-task-modal', handleOpenModal);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-task-modal', handleOpenModal);
    };
  }, [navigate]);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Automations', href: '/automations', icon: Bot },
    { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-border/40 bg-card/50 backdrop-blur-xl flex-col relative z-20">
        <div className="h-16 flex items-center px-6 border-b border-border/40">
          <div className="flex items-center gap-2 text-foreground font-semibold text-lg tracking-tight font-sans">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            ActionPilot
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary shadow-sm' 
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/40">
          <DropdownMenu>
            <DropdownMenuTrigger render={<button className="w-full text-left outline-none" />}>
              <div role="button" className="w-full flex items-center justify-start gap-3 h-auto p-2 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors">
                <Avatar className="w-9 h-9 border border-border/50 shadow-sm">
                  <AvatarImage src={user.photoURL || undefined} />
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm truncate flex-1">
                  <span className="font-semibold truncate w-full">{user.displayName}</span>
                  <span className="text-xs text-muted-foreground truncate w-full">{user.email}</span>
                </div>
                <Settings className="w-4 h-4 text-muted-foreground ml-auto opacity-50" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/40 shadow-lg">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer rounded-lg text-sm font-medium focus:bg-muted/50 focus:text-foreground">
                  <Settings className="w-4 h-4 mr-2 opacity-70" />
                  Profile Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>


      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            />
            
            {/* Sidebar drawer content */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border/40 bg-card/95 backdrop-blur-xl flex flex-col md:hidden shadow-2xl"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-border/40">
                <div className="flex items-center gap-2 text-foreground font-semibold text-lg tracking-tight font-sans">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  ActionPilot
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1 h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-primary/10 text-primary shadow-sm' 
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-border/40">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<button className="w-full text-left outline-none" />}>
                    <div role="button" className="w-full flex items-center justify-start gap-3 h-auto p-2 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors">
                      <Avatar className="w-9 h-9 border border-border/50 shadow-sm">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start text-sm truncate flex-1">
                        <span className="font-semibold truncate w-full">{user.displayName}</span>
                        <span className="text-xs text-muted-foreground truncate w-full">{user.email}</span>
                      </div>
                      <Settings className="w-4 h-4 text-muted-foreground ml-auto opacity-50" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/40 shadow-lg">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-border/40" />
                      <DropdownMenuItem onClick={() => { setIsMobileSidebarOpen(false); navigate('/settings'); }} className="cursor-pointer rounded-lg text-sm font-medium focus:bg-muted/50 focus:text-foreground">
                        <Settings className="w-4 h-4 mr-2 opacity-70" />
                        Profile Settings
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Very subtle background mesh or glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <header className="h-16 flex items-center px-4 md:px-8 border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-10 shrink-0 gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden h-9 w-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold capitalize truncate font-sans tracking-tight">
            {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).replace('-', ' ')}
          </h1>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline-flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-full border border-border/30">
              <kbd className="px-1.5 py-0.5 bg-background rounded-md border border-border/50 font-mono text-[9px] shadow-sm font-semibold">N</kbd> New Task
              <span className="mx-1 opacity-20">|</span>
              <kbd className="px-1.5 py-0.5 bg-background rounded-md border border-border/50 font-mono text-[9px] shadow-sm font-semibold">T</kbd> Tasks
            </span>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>

      <TaskCreationModal open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen} />
    </div>
  );
}
