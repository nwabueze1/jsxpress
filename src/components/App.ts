import type { AppProps } from "../types.js";

export class App {
  port: number;
  hostname: string;

  constructor(props: AppProps = {}) {
    this.port = props.port ?? 3000;
    this.hostname = props.hostname ?? "0.0.0.0";
  }
}
