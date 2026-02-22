declare module "better-sqlite3" {
  const Database: any;
  export default Database;
}

declare module "pg" {
  export const Pool: any;
}

declare module "mysql2/promise" {
  export function createPool(url: string): any;
}

declare module "mongodb" {
  export const MongoClient: any;
}
