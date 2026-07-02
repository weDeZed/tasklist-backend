import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		// Clean up database between tests
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});
	});

	describe("GET /api/tasks", () => {
		it("should retrieve all tasks", async () => {
			// Create a few tasks
			await request(app)
				.post("/api/tasks")
				.send({ title: "Task 1" });
			await request(app)
				.post("/api/tasks")
				.send({ title: "Task 2" });

			const res = await request(app)
				.get("/api/tasks");

			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
			expect(res.body.length).toBe(2);
		});

		it("should return empty array when no tasks exist", async () => {
			const res = await request(app)
				.get("/api/tasks");

			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
			expect(res.body.length).toBe(0);
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should retrieve a task by id", async () => {
			// Create a task
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Task to retrieve", description: "Retrieve test" });
			const taskId = createRes.body.id;

			// Get the task
			const getRes = await request(app)
				.get(`/api/tasks/${taskId}`);

			expect(getRes.status).toBe(200);
			expect(getRes.body.id).toBe(taskId);
			expect(getRes.body.title).toBe("Task to retrieve");
			expect(getRes.body.description).toBe("Retrieve test");
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app)
				.get("/api/tasks/999");

			expect(res.status).toBe(404);
			expect(res.body).toHaveProperty("error");
			expect(res.body.error).toBe("Task not found");
		});

		it("should return 400 when id is invalid", async () => {
			const res = await request(app)
				.get("/api/tasks/invalid");

			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty("error");
			expect(res.body.error).toBe("Invalid task ID");
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update a task", async () => {
			// Create a task
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Task to update", description: "Original" });
			const taskId = createRes.body.id;

			// Update the task
			const updateRes = await request(app)
				.put(`/api/tasks/${taskId}`)
				.send({ title: "Updated Task", description: "Updated", completed: true });

			expect(updateRes.status).toBe(200);
			expect(updateRes.body.id).toBe(taskId);
			expect(updateRes.body.title).toBe("Updated Task");
			expect(updateRes.body.description).toBe("Updated");
			expect(updateRes.body.completed).toBe(true);
		});

		it("should partially update a task", async () => {
			// Create a task
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Task", description: "Original" });
			const taskId = createRes.body.id;

			// Update only title
			const updateRes = await request(app)
				.put(`/api/tasks/${taskId}`)
				.send({ title: "Only title changed" });

			expect(updateRes.status).toBe(200);
			expect(updateRes.body.title).toBe("Only title changed");
			expect(updateRes.body.description).toBe("Original");
		});

		it("should return 404 when updating non-existent task", async () => {
			const res = await request(app)
				.put("/api/tasks/999")
				.send({ title: "Update" });

			expect(res.status).toBe(404);
			expect(res.body).toHaveProperty("error");
			expect(res.body.error).toBe("Task not found");
		});

		it("should return 400 when id is invalid", async () => {
			const res = await request(app)
				.put("/api/tasks/invalid")
				.send({ title: "Update" });

			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty("error");
			expect(res.body.error).toBe("Invalid task ID");
		});
	});

	describe("POST /api/tasks - Error Cases", () => {
		it("should return 400 when title is missing", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ description: "No title" });

			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty("error");
		});

		it("should return 400 when title is empty string", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "   " });

			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty("error");
		});

		it("should trim whitespace from title", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "  Trimmed Task  " });

			expect(res.status).toBe(201);
			expect(res.body.title).toBe("Trimmed Task");
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete a task", async () => {
			// Create a task
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Task to delete" });
			const taskId = createRes.body.id;

			// Delete the task
			const deleteRes = await request(app)
				.delete(`/api/tasks/${taskId}`);

			expect(deleteRes.status).toBe(204);

			// Verify task is deleted
			const getRes = await request(app)
				.get(`/api/tasks/${taskId}`);
			expect(getRes.status).toBe(404);
		});

		it("should return 404 when deleting non-existent task", async () => {
			const res = await request(app)
				.delete("/api/tasks/999");

			expect(res.status).toBe(404);
			expect(res.body).toHaveProperty("error");
		});

		it("should return 400 when id is invalid", async () => {
			const res = await request(app)
				.delete("/api/tasks/invalid");

			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty("error");
			expect(res.body.error).toBe("Invalid task ID");
		});
	});

	describe("Service Error Cases", () => {
		let originalFindMany: any;
		let originalFindUnique: any;
		let originalCreate: any;
		let originalUpdate: any;
		let originalDelete: any;

		beforeEach(() => {
			// Save original methods
			originalFindMany = testPrisma.task.findMany;
			originalFindUnique = testPrisma.task.findUnique;
			originalCreate = testPrisma.task.create;
			originalUpdate = testPrisma.task.update;
			originalDelete = testPrisma.task.delete;
		});

		afterEach(() => {
			// Restore original methods
			testPrisma.task.findMany = originalFindMany;
			testPrisma.task.findUnique = originalFindUnique;
			testPrisma.task.create = originalCreate;
			testPrisma.task.update = originalUpdate;
			testPrisma.task.delete = originalDelete;
		});

		it("should return 500 when getAllTasks fails", async () => {
			// Mock findMany to throw an error
			testPrisma.task.findMany = vi.fn().mockRejectedValue(
				new Error("Database connection failed")
			);

			const res = await request(app)
				.get("/api/tasks");

			expect(res.status).toBe(500);
			expect(res.body).toHaveProperty("error");
			expect(res.body.error).toBe("Failed to fetch tasks");
		});

		it("should return 500 when getTaskById service fails", async () => {
			// Mock findUnique to throw an error
			testPrisma.task.findUnique = vi.fn().mockRejectedValue(
				new Error("Database query failed")
			);

			const res = await request(app)
				.get("/api/tasks/1");

			expect(res.status).toBe(500);
			expect(res.body).toHaveProperty("error");
			expect(res.body.error).toBe("Failed to fetch task");
		});

		it("should return 500 when createTask service fails", async () => {
			// Mock create to throw an error
			testPrisma.task.create = vi.fn().mockRejectedValue(
				new Error("Database insert failed")
			);

			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "New Task" });

			expect(res.status).toBe(500);
			expect(res.body).toHaveProperty("error");
			expect(res.body.error).toBe("Failed to create task");
		});

		it("should return 500 when updateTask service fails", async () => {
			// Create a valid task first
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Task to update" });
			const taskId = createRes.body.id;

			// Restore methods for create, then mock update
			testPrisma.task.findMany = originalFindMany;
			testPrisma.task.findUnique = originalFindUnique;
			testPrisma.task.create = originalCreate;
			testPrisma.task.update = vi.fn().mockRejectedValue(
				new Error("Database update failed")
			);

			const res = await request(app)
				.put(`/api/tasks/${taskId}`)
				.send({ title: "Updated" });

			expect(res.status).toBe(500);
			expect(res.body).toHaveProperty("error");
			expect(res.body.error).toBe("Failed to update task");
		});

		it("should return 500 when deleteTask service fails", async () => {
			// Create a valid task first
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Task to delete" });
			const taskId = createRes.body.id;

			// Restore methods for create, then mock delete
			testPrisma.task.findMany = originalFindMany;
			testPrisma.task.findUnique = originalFindUnique;
			testPrisma.task.create = originalCreate;
			testPrisma.task.delete = vi.fn().mockRejectedValue(
				new Error("Database delete failed")
			);

			const res = await request(app)
				.delete(`/api/tasks/${taskId}`);

			expect(res.status).toBe(500);
			expect(res.body).toHaveProperty("error");
			expect(res.body.error).toBe("Failed to delete task");
		});
	});
});
