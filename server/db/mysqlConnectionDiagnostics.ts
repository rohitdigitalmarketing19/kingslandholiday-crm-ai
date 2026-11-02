/** Safe administrator diagnostics: never return provider messages, SQL, or credentials. */
export function mysqlConnectionDiagnostic(error:any, env:NodeJS.ProcessEnv=process.env){
 const missing=['MYSQL_HOST','MYSQL_USER','MYSQL_PASSWORD','MYSQL_DATABASE'].filter(k=>!env[k]);
 if(missing.length)return {code:'MYSQL_CONFIG_MISSING',error:'Missing environment settings: '+missing.join(', ')+'. Save them in Hostinger and redeploy.'};
 const port=Number(env.MYSQL_PORT || 3306);
 if(!Number.isInteger(port)||port<1||port>65535)return {code:'MYSQL_PORT_INVALID',error:'MYSQL_PORT must be a number, normally 3306.'};
 const nested=Array.isArray(error?.errors)?error.errors.find((item:any)=>item?.code):null;
 const code=String(error?.code || nested?.code || 'MYSQL_CONNECTION_ERROR');
 const messages:Record<string,string>={
  MYSQL_HOST_INVALID:'MYSQL_HOST must contain only the database hostname, such as srv1832.hstgr.io. Do not include https://, a port, or MYSQL_HOST=.',
  ENOTFOUND:'The MySQL hostname could not be found. Check MYSQL_HOST in Hostinger, then redeploy.',
  EAI_AGAIN:'The server could not resolve the MySQL hostname. Retry shortly; if it continues, ask Hostinger to check DNS from the Node.js app.',
  ETIMEDOUT:'The live Node.js server timed out reaching MySQL. Ask Hostinger to confirm its outbound IP and allow that IP in Remote MySQL. Also check the hostname and port.',
  ECONNREFUSED:'The MySQL server refused the network connection. Ask Hostinger to verify the database hostname, port 3306, and access from the Node.js app.',
  EHOSTUNREACH:'The database network is unreachable from the Node.js app. Ask Hostinger to check connectivity to the MySQL server.',
  ENETUNREACH:'The database network is unreachable from the Node.js app. Ask Hostinger to check its outbound network access.',
  ER_ACCESS_DENIED_ERROR:'MySQL rejected the login. Check MYSQL_USER and MYSQL_PASSWORD, and ensure this user is assigned to the selected database and the Node.js outbound IP is allowed.',
  ER_HOST_NOT_PRIVILEGED:'MySQL has not allowed this Node.js server. Add its actual outbound IP to the Remote MySQL rule for this database.',
  ER_HOST_IS_BLOCKED:'MySQL has blocked this application server. Ask Hostinger support to unblock the host and check the access rule.',
  ER_BAD_DB_ERROR:'The selected database does not exist on this MySQL host. Check the full prefixed MYSQL_DATABASE value and database hostname.',
  ER_DBACCESS_DENIED_ERROR:'The database user cannot access the selected database. Check the full database name and user assignment in Hostinger.',
  ER_CON_COUNT_ERROR:'The MySQL connection limit has been reached. Ask Hostinger to check database connections, then retry.',
  ER_USER_LIMIT_REACHED:'The database user has reached its connection limit. Ask Hostinger to check the account limits.',
  HANDSHAKE_SSL_ERROR:'MySQL TLS negotiation failed. Ask Hostinger for the required TLS settings. Certificate verification has not been disabled.',
  ER_NOT_SUPPORTED_AUTH_MODE:'This MySQL account uses an authentication method unsupported by the connection. Ask Hostinger to check the account authentication settings.'
 };
 const safeCode=/^[A-Z0-9_]{1,80}$/.test(code)?code:'MYSQL_CONNECTION_ERROR';
 const message=messages[safeCode] || (error?.stage==='session'?'The login reached MySQL, but database-session configuration failed. Send this error code to your developer.':'MySQL could not complete the connection test. Send this error code to your developer or Hostinger support.');
 // Extract only the server-side host portion when the provider explicitly reports it.
 const raw=String(error?.sqlMessage || '');
 const hostMatch=raw.match(/@'([a-zA-Z0-9.:-]+)'/) || raw.match(/Host '([a-zA-Z0-9.:-]+)'/);
 const clientHost=['ER_ACCESS_DENIED_ERROR','ER_HOST_NOT_PRIVILEGED','ER_HOST_IS_BLOCKED'].includes(safeCode)?hostMatch?.[1]:undefined;
 return {code:safeCode,error:message+' Error code: '+safeCode+'.'+(clientHost?' MySQL sees this application host: '+clientHost+'.':''),...(clientHost?{clientHost}:{})};
}
