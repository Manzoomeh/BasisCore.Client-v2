import ISource from "../../data/ISource";
import ITokenElement from "./ITokenElement";

export default class SourceTokenElement implements ITokenElement {
  source: string;
  member?: string;
  column?: string;
  readonly extractValue: (source: ISource) => string;

  constructor(parts: Array<string>) {
    this.source = parts[0].toLowerCase();
    this.member = parts[1].toLowerCase();
    this.column = parts.length > 2 ? parts.slice(2).join(".") : null;
    this.extractValue = new Function(
      "source",
      `let retVal = null;
      if (source.data.rows.length == 1) {
        retVal = (source.data.rows[0].${this.column})?.toString();
      } else if (source.data.rows.length > 1) {
        retVal = source.data.rows
              .map((row) => row.${this.column})
              .join(",");
      }
      return retVal;`
    ) as any;
  }

  get sourceName(): string {
    return `${this.source}.${this.member}`;
  }

  // g(source: ISource): any {
  //   let retVal = null;
  //   if (source.data.rows.length == 1) {
  //     retVal = source.data.rows[0];
  //   } else if (source.data.rows.length > 1) {
  //     retVal = source.data.rows
  //     .filter((row) => row).join(",");
  //   }
  //   return retVal;
  // }
}
