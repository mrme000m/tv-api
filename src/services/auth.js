const os = require('os');
const http = require('../http');
const { genAuthCookies } = require('../utils');

/**
 * @typedef {Object} User Instance of User
 * @prop {number} id User ID
 * @prop {string} username User username
 * @prop {string} firstName User first name
 * @prop {string} lastName User last name
 * @prop {number} reputation User reputation
 * @prop {number} following Number of following accounts
 * @prop {number} followers Number of followers
 * @prop {Object} notifications User's notifications
 * @prop {number} notifications.user User notifications
 * @prop {number} notifications.following Notification from following accounts
 * @prop {string} session User session
 * @prop {string} sessionHash User session hash
 * @prop {string} signature User session signature
 * @prop {string} privateChannel User private channel
 * @prop {string} authToken User auth token
 * @prop {Date} joinDate Account creation date
 */

/**
 * Get user and sessionid from username/email and password
 * @function loginUser
 * @param {string} username User username/email
 * @param {string} password User password
 * @param {boolean} [remember] Remember the session (default: false)
 * @param {string} [UA] Custom UserAgent
 * @returns {Promise<User>} Token
 */
async function loginUser(username, password, remember = true, UA = 'TWAPI/3.0') {
  const { data, headers } = await http.post(
    'https://www.tradingview.com/accounts/signin/',
    `username=${username}&password=${password}${remember ? '&remember=on' : ''}`,
    {
      headers: {
        referer: 'https://www.tradingview.com',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-agent': `${UA} (${os.version()}; ${os.platform()}; ${os.arch()})`,
      },
    }
  );

  const cookies = headers['set-cookie'];

  if (data.error) throw new Error(data.error);

  const sessionCookie = cookies.find((c) => c.includes('sessionid='));
  const session = (sessionCookie.match(/sessionid=(.*?);/) ?? [])[1];

  const signCookie = cookies.find((c) => c.includes('sessionid_sign='));
  const signature = (signCookie.match(/sessionid_sign=(.*?);/) ?? [])[1];

  return {
    id: data.user.id,
    username: data.user.username,
    firstName: data.user.first_name,
    lastName: data.user.last_name,
    reputation: data.user.reputation,
    following: data.user.following,
    followers: data.user.followers,
    notifications: data.user.notification_count,
    session,
    signature,
    sessionHash: data.user.session_hash,
    privateChannel: data.user.private_channel,
    authToken: data.user.auth_token,
    joinDate: new Date(data.user.date_joined),
  };
}

/**
 * Get user from 'sessionid' cookie
 * @function getUser
 * @param {string} session User 'sessionid' cookie
 * @param {string} [signature] User 'sessionid_sign' cookie
 * @param {string} [location] Auth page location (For france: https://fr.tradingview.com/)
 * @returns {Promise<User>} Token
 */
async function getUser(session, signature = '', location = 'https://www.tradingview.com/') {
  const { data, headers } = await http.get(location, {
    headers: {
      cookie: genAuthCookies(session, signature),
    },
    maxRedirects: 0,
  });

  if (data.includes('auth_token')) {
    return {
      id: /"id":([0-9]{1,10}),/.exec(data)?.[1],
      username: /"username":"(.*?)"/.exec(data)?.[1],
      firstName: /"first_name":"(.*?)"/.exec(data)?.[1],
      lastName: /"last_name":"(.*?)"/.exec(data)?.[1],
      reputation: parseFloat(/"reputation":(.*?),/.exec(data)?.[1] || 0),
      following: parseFloat(/,"following":([0-9]*?),/.exec(data)?.[1] || 0),
      followers: parseFloat(/,"followers":([0-9]*?),/.exec(data)?.[1] || 0),
      notifications: {
        following: parseFloat(/"notification_count":\{"following":([0-9]*),/.exec(data)?.[1] ?? 0),
        user: parseFloat(/"notification_count":\{"following":[0-9]*,"user":([0-9]*)/.exec(data)?.[1] ?? 0),
      },
      session,
      signature,
      sessionHash: /"session_hash":"(.*?)"/.exec(data)?.[1],
      privateChannel: /"private_channel":"(.*?)"/.exec(data)?.[1],
      authToken: /"auth_token":"(.*?)"/.exec(data)?.[1],
      joinDate: new Date(/"date_joined":"(.*?)"/.exec(data)?.[1] || 0),
    };
  }

  if (headers.location !== location) {
    return getUser(session, signature, headers.location);
  }

  throw new Error('Wrong or expired sessionid/signature');
}

function isAuthError(err) {
  const status = err?.response?.status || err?.status;
  if (status === 401) return true;
  if (typeof err?.message === 'string' && err.message.includes('401')) return true;
  return false;
}

/**
 * Execute a function with credentials and retry once after refreshing on 401.
 * @template T
 * @param {(session: string, signature?: string) => Promise<T>} fn
 * @param {{ session?: string, signature?: string, username?: string, password?: string, remember?: boolean, userAgent?: string, onRefresh?: (user: User) => void }} [credentials]
 * @param {{ refresh?: (username: string, password: string, remember?: boolean, userAgent?: string) => Promise<User> }} [options]
 * @returns {Promise<T>}
 */
async function withCredentialRefresh(fn, credentials = {}, options = {}) {
  const { session = '', signature = '', username, password, remember = true, userAgent, onRefresh } = credentials || {};
  try {
    return await fn(session, signature);
  } catch (err) {
    if (!isAuthError(err)) throw err;
    if (!username || !password) throw err;
    const refresh = options.refresh || loginUser;
    const user = await refresh(username, password, remember, userAgent);
    if (typeof onRefresh === 'function') onRefresh(user);
    return fn(user.session, user.signature);
  }
}

module.exports = { loginUser, getUser, withCredentialRefresh };
