export default class Replace {
  readonly TagName: string;
  readonly Template: string;
  constructor(tagName: string, template: string) {
    this.TagName = tagName;
    this.Template = template;
  }
  Applay(result: string): string {
    var str = `\\[\\(${this.TagName}\\)(.+?)\\]`;
    var matches = (<any>result).matchAll(RegExp(str, "gi"));
    for (const match of matches) {
      var template = this.Template;
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
