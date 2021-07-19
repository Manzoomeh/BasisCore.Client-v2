import ISource from "../../data/ISource";
import ITokenElement from "./ITokenElement";

export default class SourceTokenElement<TType> implements ITokenElement {
  source: string;
  member?: string;
  column?: string;
  expression: string;
  readonly extractValue: (source: ISource) => TType;

  constructor(parts: Array<string>, expression: string) {
    this.source = parts[0].toLowerCase();
    this.member = parts[1].toLowerCase();
    this.column = parts.length > 2 ? parts.slice(2).join(".") : null;
    this.expression = expression;
    this.extractValue = new Function(
      "source",
      `let retVal = null;
      if (source.rows.length == 1) {
        try{
        retVal = source.rows[0].${this.column};
        }catch(e){
          try{
            retVal = source.rows[0]['${this.column}'];
          }catch{
            throw e;
          }
        }
      } else if (source.rows.length > 1) {
        retVal = source.rows
              .map((row) => row.${this.column});
      }
      return retVal;`
    ) as any;
    // this.extractValue = new Function(
    //   "source",
    //   `const ${this.source}={${this.member}:source.rows.length == 1? source.rows[0]:source.rows}; return ${expression}??null;`
    // ) as any;
  }

  get sourceName(): string {
    return `${this.source}.${this.member}`;
  }
}
