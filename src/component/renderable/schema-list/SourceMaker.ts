import { IServerResponse } from "../../../type-alias";
import Util from "../../../Util";
import IAnswerSchema from "../schema/IAnswerSchema";
import IQuestionSchema from "../schema/IQuestionSchema";
import ISchemaSource from "./ISchemaSource";

export default class SourceMaker {
  public static async makeAsync(
    answers: IAnswerSchema,
    schemaUrl: string
  ): Promise<Array<ISchemaSource>> {
    const retVal = new Array<ISchemaSource>();
    const url = Util.formatUrl(schemaUrl, null, {
      id: answers.schemaId,
      ver: answers.schemaVersion,
      lid: answers.lid,
    });
    const response = await Util.getDataAsync<IServerResponse<IQuestionSchema>>(
      url
    );
    const schema = response.sources[0].data[0];
    schema.questions.forEach((question) => {
      const answer = answers?.properties.find((x) => x.prpId == question.prpId);
      const item: ISchemaSource = {
        schemaId: null,
        prpId: question.prpId,
        typeId: question.typeId,
        title: question.title,
        answers: answer.answers.map((x) =>
          x.parts.map((x) => x.values.map((x) => x.value))
        ),
      };
      retVal.push(item);
    });
    return retVal;
  }
}
