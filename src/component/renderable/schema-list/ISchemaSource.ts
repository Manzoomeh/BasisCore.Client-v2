export default interface ISchemaSource {
  schemaId: string;
  prpId: number;
  typeId?: number;
  title: string;
  answers: Array<Array<Array<any>>>;
}

// export class SchemaSource {
//   schemaId: string;
//   private _prp: Map<number, PropertyData>;
//   private _prp: Map<number, PropertyData>;
//   public prp(prpId: number): PropertyData {
//     return this._prp.get(prpId);
//   }
//   public type(prpId: number): PropertyData {
//     return this._ty.get(prpId);
//   }
//   prpId: number;
//   typeId?: number;
//   title: string;
//   answers: Array<Array<Array<any>>>;
// }
// export class PropertyData {
//   title: string;
//   _values: Array<string>;
//   constructor(title: string, value: Array<string>) {
//     this.title = title;
//     this._values = value;
//   }
//   public value(): string {
//     return this._values.join();
//   }
// }
