/* eslint-disable no-undef */
const request = require("supertest");
const db = require("../models/index");
const app = require("../app");
const cheerio = require("cheerio");

let server;
let agent;

function fetchCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = fetchCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Test todo application", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });
  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });

  test("Sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = fetchCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Karthik",
      lastName: "K",
      email: "testk@gmail.com",
      password: "123456",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Sign Out", async () => {
    let res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  });

  test("Testing new todo creation", async () => {
    const agent = request.agent(server);
    await login(agent, "testk@gmail.com", "123456");
    const getResponse = await agent.get("/todos"); //todos changed
    const csrfToken = fetchCsrfToken(getResponse);
    const response = await agent.post("/todos").send({
      title: "Attend meeting",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Testing for todo updating", async () => {
    const agent = request.agent(server);
    await login(agent, "testk@gmail.com", "123456");
    const getResponse = await agent.get("/todos"); //todos changes
    let csrfToken = fetchCsrfToken(getResponse);
    await agent.post("/todos").send({
      title: "Buy Laptop",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const TodosItems = await agent
      .get("/todos")
      .set("Accept", "application/json"); //todos changed
    const TodosItemsParse = JSON.parse(TodosItems.text);
    const calculateTodosTodayITem = TodosItemsParse.dueToday.length;
    const Todo = TodosItemsParse.dueToday[calculateTodosTodayITem - 1];
    const boolStatus = Todo.completed ? false : true;
    const anotherRes = await agent.get("/todos"); //todos changed
    csrfToken = fetchCsrfToken(anotherRes);

    const changeTodo = await agent
      .put(`/todos/${Todo.id}`)
      .send({ _csrf: csrfToken, completed: boolStatus });
    const UpdateTodoItemParse = JSON.parse(changeTodo.text);
    expect(UpdateTodoItemParse.completed).toBe(true);
  });

  test("Test the delete functionality", async () => {
    const agent = request.agent(server);
    await login(agent, "testk@gmail.com", "123456");
    const getResponse = await agent.get("/todos"); //todos changed
    let csrfToken = fetchCsrfToken(getResponse);
    await agent.post("/todos").send({
      title: "Drink coffee",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const TodosItems = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const TodosItemsParse = JSON.parse(TodosItems.text);
    const calculateTodosTodayITem = TodosItemsParse.dueToday.length;
    const Todo = TodosItemsParse.dueToday[calculateTodosTodayITem - 1];
    const boolStatus = Todo.completed ? false : true;
    const anotherRes = await agent.get("/todos");
    csrfToken = fetchCsrfToken(anotherRes);

    const changeTodo = await agent
      .delete(`/todos/${Todo.id}`)
      .send({ _csrf: csrfToken, completed: boolStatus });

    const boolResponse = Boolean(changeTodo.text);
    expect(boolResponse).toBe(true);
  });

  test("Test the marking an item as incomplete", async () => {
    const agent = request.agent(server);
    await login(agent, "testk@gmail.com", "123456");
    const getResponse = await agent.get("/todos"); //todos changed
    let csrfToken = fetchCsrfToken(getResponse);
    await agent.post("/todos").send({
      title: "Read book",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const TodosItems = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const TodosItemsParse = JSON.parse(TodosItems.text);
    const calculateTodosTodayITem = TodosItemsParse.dueToday.length;
    const Todo = TodosItemsParse.dueToday[calculateTodosTodayITem - 1];
    const boolStatus = !Todo.completed;
    let anotherRes = await agent.get("/todos");
    csrfToken = fetchCsrfToken(anotherRes);

    const changeTodo = await agent
      .put(`/todos/${Todo.id}`)
      .send({ _csrf: csrfToken, completed: boolStatus });

    const UpdateTodoItemParse = JSON.parse(changeTodo.text);
    expect(UpdateTodoItemParse.completed).toBe(true);

    anotherRes = await agent.get("/todos");
    csrfToken = fetchCsrfToken(anotherRes);
  });
});
