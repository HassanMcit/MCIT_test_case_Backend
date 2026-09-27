"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let UsersService = class UsersService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async findAll() {
        const db = this.databaseService.db;
        return db
            .prepare('SELECT id, name, email, role, createdAt FROM users ORDER BY name ASC')
            .all();
    }
    async findOne(id) {
        const db = this.databaseService.db;
        const user = db
            .prepare('SELECT id, name, email, role, createdAt FROM users WHERE id = ?')
            .get(id);
        if (!user) {
            throw new common_1.NotFoundException(`User #${id} not found`);
        }
        const testCaseCount = db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE testerId = ?').get(id).count;
        return {
            ...user,
            _count: {
                testCases: testCaseCount,
            },
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], UsersService);
//# sourceMappingURL=users.service.js.map