'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import {
  LayoutDashboard,
  Cctv,
  Clapperboard,
  Users,
  History,
  Settings,
  Route,
  ChevronDown,
  Search,
  Command,
  Bell,
  Menu,
  X,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  LogOut,
  Sun,
  Moon,
  Check,
  Link2,
  Info,
  ArrowRight,
  PanelLeftClose,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from './workspace-provider';
import { Button, Modal, IconButton, Badge, SearchInput } from './ui';
import { canAccess, recorders, type Role } from '@/lib/model';
const links = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/cameras', label: 'Camera workspace', icon: Cctv },
  { href: '/recordings', label: 'Recordings', icon: Clapperboard },
  { href: '/team', label: 'Team & access', icon: Users, area: 'team' },
  { href: '/activity', label: 'Activity log', icon: History, area: 'activity' },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { state, patch } = useWorkspace();
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, []);
  const roleLabel =
    state.role === 'superadmin'
      ? 'Platform owner'
      : state.role === 'admin'
        ? 'Workspace admin'
        : 'Team member';
  const title =
    links.find((l) => l.href === path)?.label ||
    (
      {
        '/settings': 'Workspace settings',
        '/platform': 'Platform management',
        '/health': 'System health',
      } as Record<string, string>
    )[path] ||
    'Workspace';
  function nav(href: string) {
    setMobile(false);
    router.push(href);
  }
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`}>
        <Link href="/" className="brand" onClick={() => setMobile(false)}>
          <span className="brand-symbol">
            <Route size={22} strokeWidth={2.5} />
          </span>
          <span>
            RGU<span className="brand-light"> / Fleet</span>
            <small>TRANSPORT INTELLIGENCE</small>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-monogram">R</span>
          <div>
            <strong>Rathinam campus</strong>
            <small>Preview workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {links
            .filter((l) => !l.area || canAccess(state.role, l.area))
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobile(false)}
                className={`nav-link ${path === l.href ? 'active' : ''}`}
                aria-current={path === l.href ? 'page' : undefined}
              >
                <l.icon size={18} />
                <span>{l.label}</span>
                {l.href === '/recordings' && state.clips.length > 0 && (
                  <span className="nav-count">{state.clips.length}</span>
                )}
                {path === l.href && <span className="nav-active-dot" />}
              </Link>
            ))}
        </nav>
        <div className="sidebar-lower">
          {state.role === 'superadmin' && (
            <>
              <p className="nav-caption">PLATFORM</p>
              <Link
                className={`nav-link ${path === '/platform' ? 'active' : ''}`}
                href="/platform"
                onClick={() => setMobile(false)}
              >
                <ShieldCheck size={18} />
                Approvals
              </Link>
              <Link
                className={`nav-link ${path === '/health' ? 'active' : ''}`}
                href="/health"
                onClick={() => setMobile(false)}
              >
                <Activity size={18} />
                System health
              </Link>
            </>
          )}
          <div className="sidebar-note">
            <span className="tiny-live" />
            <strong>A space to explore.</strong>
            <p>Sample cameras and local changes. Your real fleet stays untouched.</p>
            <button onClick={() => nav('/settings')}>
              About preview mode <ArrowUpRight size={13} />
            </button>
          </div>
          <Link
            className={`nav-link ${path === '/settings' ? 'active' : ''}`}
            href="/settings"
            onClick={() => setMobile(false)}
          >
            <Settings size={18} />
            Settings
          </Link>
          <Dropdown.Root>
            <Dropdown.Trigger className="profile-button">
              <span className="avatar">AM</span>
              <span>
                <strong>Alex Morgan</strong>
                <small>{roleLabel}</small>
              </span>
              <ChevronDown size={14} />
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                className="dropdown-content"
                side="top"
                align="start"
                sideOffset={12}
              >
                <Dropdown.Label className="dropdown-label">PREVIEW ROLE</Dropdown.Label>
                {(['admin', 'member', 'superadmin'] as Role[]).map((role) => (
                  <Dropdown.Item
                    key={role}
                    className="dropdown-item"
                    onSelect={() => {
                      patch({ role });
                      if (!canAccess(role, path.slice(1))) router.push('/');
                      toast.info(
                        `Preview role: ${role === 'superadmin' ? 'platform owner' : role}`,
                      );
                    }}
                  >
                    {state.role === role ? <Check size={15} /> : <Users size={15} />}{' '}
                    {role === 'superadmin'
                      ? 'Platform owner'
                      : role === 'admin'
                        ? 'Workspace admin'
                        : 'Team member'}
                  </Dropdown.Item>
                ))}
                <Dropdown.Separator className="dropdown-separator" />
                <Dropdown.Item
                  className="dropdown-item"
                  onSelect={() =>
                    patch({
                      settings: {
                        ...state.settings,
                        theme: state.settings.theme === 'dark' ? 'light' : 'dark',
                      },
                    })
                  }
                >
                  {state.settings.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}Switch
                  appearance
                </Dropdown.Item>
                <Dropdown.Item className="dropdown-item" onSelect={() => nav('/login')}>
                  <LogOut size={15} />
                  Account sign in
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-location">
            <IconButton
              label="Open navigation"
              className="mobile-menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </IconButton>
            <span className="breadcrumb-root">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <button className="global-search" onClick={() => setSearch(true)}>
              <Search size={15} />
              <span>Search anything...</span>
              <kbd>
                <Command size={10} /> K
              </kbd>
            </button>
            <Badge tone="amber">Preview</Badge>
            <IconButton label="Notifications" onClick={() => setNotifications(true)}>
              <Bell size={18} />
              <span className="notification-dot" />
            </IconButton>
          </div>
        </header>
        <div className="preview-banner">
          <Info size={14} />
          <span>
            Preview workspace. Camera panels and statuses are samples; changes stay in this browser.
          </span>
          <Link href="/login">
            Connect a backend <ArrowRight size={13} />
          </Link>
        </div>
        <main id="main-content" className="main-content" key={path}>
          {children}
        </main>
        <footer className="app-footer">
          <span>
            RGU Fleet Management <i /> Built for a clearer view.
          </span>
          <span>
            Workspace preview <span className="footer-dot" />
          </span>
        </footer>
      </div>
      <Modal
        open={search}
        onOpenChange={setSearch}
        title="Find your next view"
        description="Search sample recorders or jump to a workspace page."
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search cameras, pages or locations"
        />
        <div className="command-results">
          {[
            ...links.map((l) => ({ title: l.label, subtitle: 'Workspace page', href: l.href })),
            ...recorders.map((r) => ({
              title: r.name,
              subtitle: r.location,
              href: '/cameras?recorder=' + r.id,
            })),
          ]
            .filter((l) => (l.title + l.subtitle).toLowerCase().includes(query.toLowerCase()))
            .map((l) => (
              <button
                key={l.href}
                onClick={() => {
                  setSearch(false);
                  setQuery('');
                  nav(l.href);
                }}
              >
                <Search size={16} />
                <span>
                  <strong>{l.title}</strong>
                  <small>{l.subtitle}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
        </div>
      </Modal>
      <Modal
        open={notifications}
        onOpenChange={setNotifications}
        title="Your notifications"
        description="A quiet place for updates that matter."
      >
        <div className="notification-card">
          <Info size={18} />
          <div>
            <strong>Welcome to your new workspace</strong>
            <p>
              This is the React frontend preview. Backend connection and live camera streaming will
              follow the backend extraction.
            </p>
            <small>Workspace update</small>
          </div>
        </div>
        <Button className="w-full mt-4" onClick={() => setNotifications(false)}>
          All caught up
        </Button>
      </Modal>
    </div>
  );
}
