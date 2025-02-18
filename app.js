import express from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { assert } from "superstruct";
import * as dotenv from "dotenv";
import {
  CreateUser,
  PatchUser,
  CreateProduct,
  PatchProduct,
  CreateOrder,
  CreateSavedProduct,
} from "./structs.js";

dotenv.config();

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(cors());

function asyncHandler(handler) {
  return async function (req, res) {
    try {
      await handler(req, res);
    } catch (e) {
      console.log("Error occured");
      console.log(e);
      if (
        e.name === "StructError" || // 1.
        (e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002") || // 2.
        e instanceof Prisma.PrismaClientValidationError // 3.
      ) {
        res.status(400).send({ message: e.message });
      } else if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        res.status(404).send({ message: e.message });
      } else {
        res.status(500).send({ message: e.message });
      }
    }
  };
}

// users
app.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { offset = 0, limit = 10, order = "newest" } = req.query;
    let orderBy;
    switch (order) {
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
      default:
        orderBy = { createdAt: "desc" };
    }
    const users = await prisma.user.findMany({
      orderBy,
      skip: parseInt(offset),
      take: parseInt(limit),
      include: {
        userPreference: {
          select: {
            receiveEmail: true,
          },
        },
      },
    });
    res.send(users);
  })
);

app.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Destructuring assignment
    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        userPreference: {
          select: {
            receiveEmail: true,
          },
        },
      },
    });
    console.log(user);
    res.send(user);
  })
);

app.post(
  "/users",
  asyncHandler(
    asyncHandler(async (req, res) => {
      assert(req.body, CreateUser);
      const { userPreference, ...userFields } = req.body;
      const user = await prisma.user.create({
        data: {
          ...userFields,
          userPreference: {
            create: userPreference,
          },
        },
        include: {
          userPreference: true,
        },
      });
      res.status(201).send(user);
    })
  )
);

app.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    assert(req.body, PatchUser);

    const { userPreference, ...userFields } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...userFields,
        userPreference: {
          update: userPreference,
        },
      },
      include: {
        userPreference: true,
      },
    });
    res.send(user);
  })
);

app.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id },
    });
    res.send("Success delete");
  })
);

app.get(
  "/users/:id/saved-products",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { savedProducts } = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        savedProducts: true,
      },
    });
    res.send(savedProducts);
  })
);

 
app.post(
  "/users/:id/saved-products",
  asyncHandler(async (req, res) => {
    assert(req.body, CreateSavedProduct);
    const { id: userId } = req.params;
    const { productId } = req.body;
    //판단로직 // 이상품이 savedProduct에 있는지 확인하는것것
    const savedCount = await prisma.user.count({
      where : {
        id : userId,
        savedProducts : {
          some : { id : productId}
        }
      }
    });
    const condition = 
    savedCount > 0
    ?  {disconnect : {id : productId}}
    :  {connect : {id : productId} };


    const { savedProducts } = await prisma.user.update({
      where: { id: userId },
      data: { 
        savedProducts : condition
      },
      include: {
        savedProducts: true,
      },
    });
    res.send(savedProducts); 
  })
);

app.get(
  "/users/:id/orders",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { orders } = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        orders: true,
      },
    });
    res.send(orders);
  })
);

// products
app.get(
  "/products",
  asyncHandler(async (req, res) => {
    const { offset = 0, limit = 10, order, category } = req.query;
    let orderBy;
    switch (order) {
      case "priceLowest":
        orderBy = { price: "asc" };
        break;
      case "priceHighest":
        orderBy = { price: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
      default:
        orderBy = { createdAt: "desc" };
    }
    const where = category ? { category } : {};
    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip: parseInt(offset),
      take: parseInt(limit),
    });
    console.log(products);
    res.send(products);
  })
);

app.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
    });
    console.log(product);
    res.send(product);
  })
);

app.post(
  "/products",
  asyncHandler(async (req, res) => {
    assert(req.body, CreateProduct);
    const product = await prisma.product.create({
      data: req.body,
    });
    res.send(product);
  })
);

app.patch(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    assert(req.body, PatchProduct);
    const product = await prisma.product.update({
      where: { id },
      data: req.body,
    });
    res.send(product);
  })
);

app.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.product.delete({
      where: { id },
    });
    res.sendStatus(204);
  })
);

app.post(
  "/orders",
  asyncHandler(async (req, res) => {
    assert(req.body, CreateOrder);
    const { userId, orderItems } = req.body;


    //1. get products
    const productIds = orderItems.map((orderItem) => orderItem.productId);
    const products = await prisma.product.findMany({
      where: { id : { in : productIds  }}, //이 배열값에 속하는 모든 값을 가져오라는 것 "in"
    });

    function getQuantity(productId) {  // 매개변수 이름을 productId로 수정
      const { quantity } = orderItems.find((orderItem) => orderItem.productId === productId);
      return quantity;
    } 
    //2. 재고와 주문량 비교
    const isSufficientStock = products.every((product) => {
      const { id, stock} = product;
      return stock >= getQuantity(id);
    });

    //3. error or created order
    if(!isSufficientStock){
      throw new Error("insufficient stock")
    }  


    //4. 재고에서 주문한만큼 빼보기! 
  const queries = productIds.map((productId) => 
      prisma.product.update({
        where : {id : productId},
        data :{
          stock : {
            decrement : getQuantity(productId),
          }
        } 
      })); 
      await Promise.all(queries);

    const [order]  = await prisma.$transaction([
      prisma.order.create({
        data: {
          user: {
            connect: { id: userId },
          },
          // userId,
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: true,
        },
      }),
      ...queries
    ]);  
    res.status(201).send(order);
  })
);  
// 우리는 재고를 먼저 감소시킨후 주문을 제공

  


//이상품의 제고를 확인하는 productrecode의 재고를 확인하고 그 product의 제고보다 유저가 주문한 
// 수가 크다면 더이상 주문을 제공하지말고 살수 없다는 메세지를 드림.

app.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        orderItems: true,
      },
    });
    // 1번 방식
    let total = 0;
    order.orderItems.forEach(({ unitPrice, quantity }) => {
      total += unitPrice * quantity;
    });

    // 2번 방식
    // const total = order.orderItems.reduce((acc, { unitPrice, quantity }) => {
    //   return acc + unitPrice * quantity;
    // }, 0);

    order.total = total;
    res.send(order);
  })
);

// app.listen
app.listen(process.env.PORT || 3000, () =>
  console.log(`Server started on ${process.env.PORT}`)
);
