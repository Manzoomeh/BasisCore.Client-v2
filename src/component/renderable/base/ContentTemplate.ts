import ITemplate from "./ITemplate";

export default class ContentTemplate implements ITemplate {
  private contents: Array<ITemplate> = new Array<ITemplate>();
  private template: string;
  private readonly reservedKeys: Array<string>;
  constructor(template: string, reservedKeys: Array<string>) {
    this.template = template;
    this.reservedKeys = reservedKeys;
    if (template) {
      this.extractContents();
    }
  }

  // private extractContents() {
  //   //const r = /@([a-z\_]{1}[\w.(),'"\[\]]*)@?/gi;
  //   const r = /([^@]|^)@(?:([^@\s]+)@|([^@\s]+))/gi;
  //   let d;
  //   let startIndex = 0;
  //   while ((d = r.exec(this.template)) !== null) {
  //     const finded = d[0];
  //     const preChar = d[1];
  //     const pattern = d[2] ?? d[3];
  //     const index = d.index + preChar.length;
  //     console.log(d, { finded, preChar, pattern, index });

  //     if (startIndex != d.index) {
  //       this.contents.push(
  //         new StringTemplate(this.template.slice(startIndex, d.index))
  //       );
  //     }
  //     this.contents.push(new ExpressionTemplate(d[1], this.reservedKeys));
  //     startIndex = d.index + d[0].length;
  //   }
  //   if (startIndex != this.template.length) {
  //     this.contents.push(new StringTemplate(this.template.slice(startIndex)));
  //   }
  //   console.log(this.contents);
  // }

  private extractContents() {
    //const r = /@([a-z\_]{1}[\w.(),'"\[\]]*)@?/gi;
    const pattern = /([^@]|^)@(?:([^@\s]+)@|([^@\s]+))/gi;
    let matchResult;
    let startIndex = 0;
    while ((matchResult = pattern.exec(this.template)) !== null) {
      const finding = matchResult[0];
      const preChar = matchResult[1];
      const expression = matchResult[2] ?? matchResult[3];
      const index = matchResult.index + preChar.length;
      // console.log(matchResult, {
      //   result: finding,
      //   preChar,
      //   pattern: expression,
      //   index,
      // });

      if (startIndex != index) {
        this.contents.push(
          new StringTemplate(this.template.slice(startIndex, index))
        );
      }
      this.contents.push(new ExpressionTemplate(expression, this.reservedKeys));
      startIndex = index + finding.length - 1;
    }
    if (startIndex != this.template.length) {
      this.contents.push(new StringTemplate(this.template.slice(startIndex)));
    }
    //console.log(this.contents);
  }

  public getValue(data: any): string {
    return this.contents
      .map((x) => x.getValue(data))
      .reduce((r, v) => (r += v), "");
  }
}

class StringTemplate implements ITemplate {
  readonly content: string;
  constructor(content: string) {
    this.content = content;
  }
  getValue(_: any): string {
    return this.content;
  }
}

class ExpressionTemplate implements ITemplate {
  private readonly rawExpression: string;
  private readonly reservedKeys: Array<string>;
  private getValue1: (...data: any) => string;
  constructor(rawExpression: string, reservedKeys: Array<string>) {
    this.rawExpression = rawExpression;
    this.reservedKeys = reservedKeys;
  }

  getValue(data: any): string {
    if (!this.getValue1) {
      try {
        this.getValue1 = new Function(
          ...Object.keys(data),
          ...Object.keys(data).map((key, index) => `col${index + 1}=${key}`),
          `${
            this.reservedKeys
              ?.map((key) => `const ${key}='@${key}';`)
              .join("") ?? ""
          }return ${this.rawExpression};`
        ) as any;
      } catch (ex) {
        console.error(
          `Error in create binding expression for '${this.rawExpression}'`,
          ex
        );
        throw ex;
      }
    }
    return this.getValue1(...Object.values(data));
  }
}
