import { inject, injectable } from "tsyringe";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import IToken from "../../../token/IToken";
import SourceBaseComponent from "../../SourceBaseComponent";
import IAnswerSchema from "../schema/IAnswerSchema";
import SchemaFaceCollection from "./SchemaFace";
import SourceMaker from "./SourceMaker";

@injectable()
export class SchemaListComponent extends SourceBaseComponent {
  private urlToken: IToken<string>;
  private _faces: SchemaFaceCollection;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    this.urlToken = this.getAttributeToken("schemaUrl");
    this._faces = new SchemaFaceCollection(this.node, this.context);
  }

  protected async renderSourceAsync(dataSource: ISource): Promise<any> {
    if (dataSource) {
      const answers: Array<IAnswerSchema> = dataSource.rows;
      answers.forEach(this.renderAnswerAsync.bind(this));
    }
  }

  private async renderAnswerAsync(answer: IAnswerSchema): Promise<void> {
    const urlStr = await this.urlToken?.getValueAsync();
    const source = await SourceMaker.makeAsync(answer, urlStr);

    source.forEach((item) => {
      const div = document.createElement("div");
      div.appendChild(document.createTextNode(item.title));
      this.setContent(div, true);
    });

    this._faces;
  }
}
