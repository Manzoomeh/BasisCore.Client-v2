import IContext from "../../../context/IContext";
import IToken from "../../../token/IToken";
import ContentTemplate from "../base/template/ContentTemplate";
import ITemplate from "../base/template/ITemplate";
import ISchemaSource from "./ISchemaSource";

export default class SchemaFaceCollection {
  private readonly _faces: Array<SchemaFace>;
  constructor(element: Element, context: IContext) {
    this._faces = Array.from(element.querySelectorAll("face")).map(
      (x) => new SchemaFace(x, context)
    );
  }

  public async getValueAsync(data: Array<ISchemaSource>): Promise<string> {
    let retVal: string = null;
    for (const item of data) {
      for (const face of this._faces) {
        const result = await face.tryGetValueAsync(item);
        if (result) {
          retVal += result;
          break;
        }
      }
    }
    return retVal;
  }
}

class SchemaFace {
  private readonly _schemaIdList: Array<string>;
  private readonly _template: ITemplate<any>;
  constructor(element: Element, context: IContext) {
    this._schemaIdList = element.getAttribute("schemaIds")?.split(" ");
    const template = element.getTemplate();
    this._template = new ContentTemplate(context, template, null);
  }

  public tryGetValueAsync(data: ISchemaSource): Promise<string> {
    return !this._schemaIdList ||
      this._schemaIdList.indexOf(data.schemaId) != -1
      ? this._template.getValueAsync(data)
      : null;
  }
}
