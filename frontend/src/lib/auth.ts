import Cookies from "universal-cookie"

export type AuthSession = {
  accessToken: string
  refreshToken: string
}

const ACCESS_TOKEN_COOKIE = "stock_lan_access_token"
const REFRESH_TOKEN_COOKIE = "stock_lan_refresh_token"
const cookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: window.location.protocol === "https:",
}

const cookies = new Cookies()

export function getAccessToken() {
  return cookies.get(ACCESS_TOKEN_COOKIE) as string | undefined
}

export function getRefreshToken() {
  return cookies.get(REFRESH_TOKEN_COOKIE) as string | undefined
}

export function hasSession() {
  return Boolean(getAccessToken() && getRefreshToken())
}

export function saveSession({ accessToken, refreshToken }: AuthSession) {
  cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: 60 * 15,
  })
  cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearSession() {
  cookies.remove(ACCESS_TOKEN_COOKIE, cookieOptions)
  cookies.remove(REFRESH_TOKEN_COOKIE, cookieOptions)
}
