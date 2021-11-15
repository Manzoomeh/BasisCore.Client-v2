import { inject, injectable } from "tsyringe";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import IToken from "../../../token/IToken";
import { IServerResponse } from "../../../type-alias";
import Util from "../../../Util";
import SourceBaseComponent from "../../SourceBaseComponent";
import IFormMakerOptions from "../schema/IFormMakerOptions";
import IQuestionSchema, { IAnswerSchema } from "../schema/ISchema";
import { IUserActionResult } from "../schema/IUserActionResult";
import SourceMaker from "./SourceMaker";

@injectable()
export class SchemaListComponent extends SourceBaseComponent {
  private urlToken: IToken<string>;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    this.urlToken = this.getAttributeToken("schemaUrl");
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
    console.log(source);
    source.forEach((item) => {
      const div = document.createElement("div");
      div.appendChild(document.createTextNode(item.title));
      this.setContent(div, true);
    });
  }
}
