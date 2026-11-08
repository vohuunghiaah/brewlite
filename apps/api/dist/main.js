"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: [
            'https://scaling-dollop-gxr9xjw7xg7gcvg5g-3000.app.github.dev',
        ],
        methods: [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'OPTIONS',
        ],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
        ],
        credentials: false,
    });
    await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
    console.log('BrewLite API đang chạy');
}
void bootstrap();
//# sourceMappingURL=main.js.map