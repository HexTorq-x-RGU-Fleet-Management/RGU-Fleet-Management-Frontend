'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { AsciiReveal, type AsciiRevealHandle } from 'ascii-reveal';
import {
  LayoutDashboard,
  BusFront,
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
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from './workspace-provider';
import { Button, Modal, IconButton, SearchInput, Badge } from './ui';
import { canAccess } from '@/lib/model';
// Reveal before the browser paints so a freshly routed page is masked first
// instead of showing for a frame and then snapping back into the decode.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const dashboardCardSelector = [
  '.stat-card',
  '.bus-card',
  '.recorder-card',
  '.coverage-card',
  '.activity-card',
  '.journey-reading',
  '.clip-card',
  '.admin-metric-card',
  '.admin-workspace-card',
  '.admin-health-nominal-card',
].join(', ');
const links = [
  { href: '/', label: 'Fleet overview', icon: LayoutDashboard },
  { href: '/buses', label: 'Buses', icon: BusFront },
  { href: '/cameras', label: 'Camera workspace', icon: Cctv },
  { href: '/recordings', label: 'Recordings', icon: Clapperboard },
  { href: '/team', label: 'Team & access', icon: Users, area: 'team' },
  { href: '/activity', label: 'Activity log', icon: History, area: 'activity' },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, user, provider, signOut, patch } = useWorkspace(),
    path = usePathname(),
    router = useRouter();
  const [mobile, setMobile] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(''),
    [notifications, setNotifications] = useState(false),
    [currentTime, setCurrentTime] = useState('');
  const asciiReveal = useRef<AsciiRevealHandle>(null),
    shellRef = useRef<HTMLDivElement>(null),
    wasMobile = useRef(false);
  useEffect(() => {
    if (mobile) {
      shellRef.current?.querySelector<HTMLElement>('.mobile-sidebar-close')?.focus();
    } else if (wasMobile.current) {
      shellRef.current?.querySelector<HTMLElement>('.mobile-menu')?.focus();
    }
    wasMobile.current = mobile;
  }, [mobile]);
  useIsomorphicLayoutEffect(() => {
    const reveal = asciiReveal.current;
    if (!reveal || !reveal.element) return;
    /*
     * Cards keep their real chrome: the decode pass no longer swaps them for
     * surface plates (blank boxes with corner frames), which read as broken
     * flashes on refresh. The fast timing keeps every run readable in <= 400 ms.
     */
    void reveal.reveal({ duration: 'fast' });
  }, [path]);
  useEffect(() => {
    const root = asciiReveal.current?.element;
    if (!root || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver((mutations) => {
      const scopes: HTMLElement[] = [];
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const targets = [
            ...(node.matches(dashboardCardSelector) ? [node] : []),
            ...node.querySelectorAll<HTMLElement>(dashboardCardSelector),
          ].filter(
            (element) =>
              element.isConnected &&
              root.contains(element) &&
              !element.closest('[data-ascii="skip"]'),
          );
          if (!targets.length) continue;
          scopes.push(node);
        }
      }
      if (!scopes.length) return;
      const reveal = asciiReveal.current;
      if (!reveal) return;
      /*
       * Reveal inside the mutation callback, before the browser paints, so newly
       * rendered cards are masked by the reveal before they are first shown.
       *
       * A batch is revealed as ONE run under the nearest common ancestor of the
       * added nodes. Starting a run per node spawned a canvas per card and left
       * the cards hidden until every independent run had finished, which is what
       * made cards blank out after the skeleton hand-off.
       */
      let scope: HTMLElement = scopes[0];
      for (const node of scopes) {
        while (scope && !scope.contains(node)) scope = scope.parentElement as HTMLElement;
        if (!scope) break;
      }
      if (!scope || !root.contains(scope)) scope = root;
      if (scope === root) {
        for (const node of scopes) {
          if (node.isConnected) void reveal.reveal({ within: node, duration: 'fast' });
        }
        return;
      }
      const runScope = scope;
      void reveal.reveal({ within: runScope, duration: 'fast' });
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [path]);
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST',
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('rgu-sidebar-collapsed') === 'true');
    } catch {}
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobile(false);
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, []);
  if (!user) return null;
  const list = links.filter((l) => canAccess(user.role, l.area || l.href.slice(1)));
  const title =
    list.find((l) => l.href === path)?.label ||
    (
      {
        '/settings': 'Workspace settings',
        '/platform': 'Platform management',
        '/health': 'System health',
      } as Record<string, string>
    )[path] ||
    'Workspace';
  function toggle() {
    setCollapsed(!collapsed);
    try {
      localStorage.setItem('rgu-sidebar-collapsed', String(!collapsed));
    } catch {}
  }
  function nav(href: string) {
    setMobile(false);
    router.push(href);
  }
  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`} ref={shellRef}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation backdrop"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="workspace-sidebar"
        className={`sidebar ${mobile ? 'sidebar-open' : ''}`}
        aria-label="Workspace sidebar"
        role={mobile ? 'dialog' : undefined}
        aria-modal={mobile || undefined}
        data-lenis-prevent
      >
        <IconButton
          label="Close navigation"
          className="mobile-sidebar-close"
          onClick={() => setMobile(false)}
        >
          <X size={18} />
        </IconButton>
        <Link href="/" className="brand" onClick={() => setMobile(false)}>
          <span className="brand-symbol">
            <img src="/rathinam-logo.svg" alt="Rathinam Logo" width={34} height={34} />
          </span>
          <span>
            <span className="brand-logo-rgu">
              <span className="brand-r">R</span>
              <span className="brand-g">G</span>
              <span className="brand-u">U</span>
            </span>
            <span className="brand-light"> / Fleet</span>
            <small>RATHINAM GLOBAL UNIVERSITY</small>
          </span>
        </Link>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {list.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${path === l.href ? 'active' : ''}`}
              aria-current={path === l.href ? 'page' : undefined}
              aria-label={l.label}
              title={l.label}
              onClick={() => setMobile(false)}
            >
              <l.icon size={18} />
              <span>{l.label}</span>
              {path === l.href && <span className="nav-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-lower">
          {user.role === 'superadmin' && (
            <>
              <p className="nav-caption">PLATFORM</p>
              <Link
                href="/platform"
                aria-label="Approvals"
                title="Approvals"
                className={`nav-link ${path === '/platform' ? 'active' : ''}`}
                onClick={() => setMobile(false)}
              >
                <ShieldCheck size={18} />
                <span>Approvals</span>
              </Link>
              <Link
                href="/health"
                aria-label="System health"
                title="System health"
                className={`nav-link ${path === '/health' ? 'active' : ''}`}
                onClick={() => setMobile(false)}
              >
                <Activity size={18} />
                <span>System health</span>
              </Link>
            </>
          )}
          <Link
            href="/settings"
            className={`nav-link ${path === '/settings' ? 'active' : ''}`}
            aria-label="Settings"
            title="Settings"
            onClick={() => setMobile(false)}
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
          <Dropdown.Root>
            <Dropdown.Trigger
              className="profile-button"
              aria-label="Account menu"
              title="Account menu"
            >
              <span className="avatar">
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <span>
                <strong>{user.fullName}</strong>
                <small>
                  {user.role === 'superadmin'
                    ? 'Platform owner'
                    : user.role === 'admin'
                      ? 'Workspace admin'
                      : 'Team member'}
                </small>
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
                <Dropdown.Label className="dropdown-label">{user.email}</Dropdown.Label>
                <Dropdown.Item className="dropdown-item" onSelect={() => nav('/settings')}>
                  <Settings size={15} />
                  Account settings
                </Dropdown.Item>
                <Dropdown.Item
                  className="dropdown-item"
                  onSelect={() =>
                    void patch({
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
                <Dropdown.Separator className="dropdown-separator" />
                <Dropdown.Item
                  className="dropdown-item"
                  onSelect={() => {
                    void signOut()
                      .then(() => router.replace('/login'))
                      .catch((e) => toast.error(e.message));
                  }}
                >
                  <LogOut size={15} />
                  Sign out
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        </div>
      </aside>
      <IconButton
        label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="sidebar-toggle sidebar-edge-toggle"
        aria-expanded={!collapsed}
        aria-controls="workspace-sidebar"
        onClick={toggle}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </IconButton>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-location">
            <IconButton
              label="Open navigation"
              className="mobile-menu"
              aria-expanded={mobile}
              aria-controls="workspace-sidebar"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </IconButton>
            <span className="breadcrumb-root">{user.tenantName || 'Platform'}</span>
            <span className="breadcrumb-slash">/</span>
            <strong className="topbar-page-topic font-bold">{title}</strong>
          </div>
          <div className="topbar-actions">
            {currentTime && (
              <span className="topbar-clock-badge" title="Local time (Asia/Kolkata)">
                <Clock size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                {currentTime}
              </span>
            )}
            <button className="global-search" onClick={() => setSearch(true)}>
              <Search size={15} />
              <span>Search anything...</span>
              <kbd>
                <Command size={10} />K
              </kbd>
            </button>
            {user.role !== 'superadmin' && (
              <Badge tone={provider?.connected ? 'green' : 'amber'}>
                {provider?.connected ? 'Hik-Connect' : 'Connect cameras'}
              </Badge>
            )}
            <IconButton label="Notifications" onClick={() => setNotifications(true)}>
              <Bell size={18} />
            </IconButton>
          </div>
        </header>
        <AsciiReveal
          ref={asciiReveal}
          as="main"
          id="main-content"
          className="main-content"
          key={path}
          preset="decode"
          duration="fast"
          origin="top-left"
          selector={dashboardCardSelector}
          revealOnMount={false}
          lazy
          inert={mobile || undefined}
        >
          {children}
        </AsciiReveal>
        <footer className="app-footer" inert={mobile || undefined}>
          <span>
            RGU Fleet Management <i />
            By HexTorq for Rathinam Global University
          </span>
          <span>Authenticated workspace</span>
        </footer>
      </div>
      <Modal
        open={search}
        onOpenChange={setSearch}
        title="Find your next view"
        description="Search your permitted buses and recorders."
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search cameras, pages or locations"
        />
        <div className="command-results">
          {[
            ...list.map((l) => ({ title: l.label, subtitle: 'Workspace page', href: l.href })),
            ...state.buses.map((b) => ({
              title: b.busNumber,
              subtitle: b.registration,
              href: '/buses?bus=' + b.id,
            })),
            ...state.recorders.map((r) => ({
              title: r.name,
              subtitle: r.location,
              href: '/cameras?recorder=' + encodeURIComponent(r.id),
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
        title="Connection notifications"
        description="Current workspace connection state."
      >
        <p>
          {provider?.needsReconnect
            ? 'Your Hik-Connect authorization needs attention. Open account settings to reconnect.'
            : provider?.connected
              ? 'Hik-Connect account connected. Recorder status comes from the provider.'
              : 'No Hik-Connect connection is configured for this workspace.'}
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            setNotifications(false);
            nav('/settings');
          }}
        >
          Account settings
        </Button>
      </Modal>
    </div>
  );
}
