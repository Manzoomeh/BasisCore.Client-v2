// import "reflect-metadata";

// import "./tsyringe.config";

// import { singleton } from "tsyringe";

// interface IFoo {
//   // ...
// }

// @singleton()
// class Foo implements IFoo {
//   constructor() {
//     console.log("f");
//   }
// }

// //https://github.com/microsoft/tsyringe#example-with-interfaces

// import { container } from "tsyringe";

// container.register("IFoo", {
//   useFactory: (c) => c.resolve(Foo),
// });

// console.log(container.resolve<IFoo>("IFoo"));
// console.log(container.resolve(Foo));
