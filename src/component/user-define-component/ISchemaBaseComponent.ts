import { IPartValue } from "../renderable/schema/IAnswerSchema";
import { IValidationOptions } from "../renderable/schema/IQuestionSchema";
import { IUserActionPartValue } from "../renderable/schema/IUserActionResult";
import IValidationError from "../renderable/schema/IValidationError";

export default interface ISchemaBaseComponent {
  setValues(values: Array<IPartValue>);
  validate(options: IValidationOptions): IValidationError;
  getValuesForValidate(): any | Array<any>;
  getAddedValues(): Array<IUserActionPartValue>;
  getEditedValues(baseValues: Array<IPartValue>): Array<IUserActionPartValue>;
  getDeletedValues(baseValues: Array<IPartValue>): Array<IUserActionPartValue>;
}
