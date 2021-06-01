export default class Replace {
  readonly tagName: string;
  readonly template: string;
  constructor(tagName: string, template: string) {
    this.tagName = tagName;
    this.template = template;
  }
  apply(result: string): string {
    var str = `\\[\\(${this.tagName}\\)(.+?)\\]`;
    var matches = (<any>result).matchAll(RegExp(str, "gi"));
    for (const match of matches) {
      var template = this.template;
      var params = <string[]>match[1].split("|");
      params.forEach(
        (param, index, _) =>
          (template = template.replace(`@val${index + 1}`, param))
      );
      result = result.replace(match[0], template);
    }
    return result;
  }
}
