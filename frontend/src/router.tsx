import { lazy, Suspense, useEffect } from "react"
import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router"

import { LoginScreen } from "@/components/auth/login-screen"
import { clearSession, hasSession } from "@/lib/auth"
import { SetupScreen } from "@/components/auth/setup-screen"
import { useSetupStatus } from "@/hooks/auth/use-setup-status"

const DashboardScreen = lazy(() =>
  import("@/components/dashboard/dashboard-screen").then((module) => ({
    default: module.DashboardScreen,
  }))
)

function RootLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    const redirectToLogin = () => {
      clearSession()
      void navigate({ to: "/" })
    }

    window.addEventListener("auth:expired", redirectToLogin)
    return () => window.removeEventListener("auth:expired", redirectToLogin)
  }, [navigate])

  return <Outlet />
}

function LoginRoute() {
  const { data, isLoading } = useSetupStatus()

  if (hasSession()) {
    return <Navigate to="/dashboard" />
  }

  if (isLoading) {
    return <InitialLoadingScreen />
  }

  if (data?.needsSetup) {
    return <Navigate to="/setup" />
  }

  return <LoginScreen />
}

function SetupRoute() {
  const { data, isLoading } = useSetupStatus()

  if (hasSession()) {
    return <Navigate to="/dashboard" />
  }

  if (isLoading) {
    return <InitialLoadingScreen />
  }

  if (!data?.needsSetup) {
    return <Navigate to="/" />
  }

  return <SetupScreen />
}

function DashboardRoute() {
  if (!hasSession()) {
    return <Navigate to="/" />
  }

  return (
    <Suspense fallback={<InitialLoadingScreen />}>
      <DashboardScreen />
    </Suspense>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LoginRoute,
})
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardRoute,
})
const dashboardModuleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard/$",
  component: DashboardRoute,
})
const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup",
  component: SetupRoute,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  setupRoute,
  dashboardRoute,
  dashboardModuleRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

function InitialLoadingScreen() {
  return <main className="min-h-svh bg-[#f7f8f6] dark:bg-background" />
}
