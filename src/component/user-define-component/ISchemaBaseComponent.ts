import { IPartValue } from "../renderable/schema/IAnswerSchema";
import { IValidationOptions } from "../renderable/schema/IQuestionSchema";
import { IUserActionPartValue } from "../renderable/schema/IUserActionResult";
import IValidationError from "../renderable/schema/IValidationError";

export default interface ISchemaBaseComponent {
  setValues(values: Array<IPartValue>);
  validateAsync(options: IValidationOptions): Promise<IValidationError>;
  getValuesForValidateAsync(): Promise<any> | Promise<Array<any>>;
  getAddedValuesAsync(): Promise<Array<IUserActionPartValue>>;
  getEditedValuesAsync(
    baseValues: Array<IPartValue>
  ): Promise<Array<IUserActionPartValue>>;
  getDeletedValuesAsync(
    baseValues: Array<IPartValue>
  ): Promise<Array<IUserActionPartValue>>;
}
