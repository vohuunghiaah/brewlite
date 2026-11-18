# BÁO CÁO KIỂM TOÁN VÀ NGHIỆM THU CI/CD (TASK 4.4 — CONTINUOUS INTEGRATION)
## DỰ ÁN: BREWLITE — HỆ THỐNG ĐẶT CÀ PHÊ TRỰC TUYẾN
### PHÂN HỆ: TASK 4.4 — AUTOMATED CI QUALITY GATES & BRANCH PROTECTION

- **Mã tài liệu:** `DOC-CI-01`
- **Phiên bản:** 1.0.0
- **Ngày thực hiện:** 18/11/2026
- **Nhánh kiểm thử:** `ci/task4-4-final-acceptance`
- **Pull Request:** [#28](https://github.com/vohuunghiaah/brewlite/pull/28)
- **Kỹ sư phụ trách:** Senior DevOps Engineer & Independent QA Reviewer

---

## A. Baseline Repository

- **Repository:** `https://github.com/vohuunghiaah/brewlite` (Assignment 2 chính thức).
- **Trạng thái nhánh `main` trước triển khai Task 4.4:**
  - PR #27 (`feat/task4-3-menu-mvp`) đã được **MERGED** tại commit `755030860e5c4ac728dce7ee9185fcff5bb65a09`.
  - Lịch sử Git trên `main` sạch sẽ, không có xung đột, toàn bộ 4.1, 4.2, 4.3 đã hòa vào `main`.
  - Cấu hình Monorepo gồm 3 phân vùng độc lập: `apps/api` (NestJS 12), `apps/web` (Next.js 16 App Router), `docs/` (toàn bộ tạo phẩm Task 1–4).

---

## B. Yêu Cầu Chính Thức Task 4.4 (Theo Mục 6.4 Assignment 2)

Theo đề bài môn học Công nghệ Phần mềm — Assignment 2, Task 4.4 yêu cầu thiết lập hệ thống tích hợp liên tục (Continuous Integration) bảo đảm:
1. **Tự động kích hoạt (Automated Triggers):** CI phải tự động chạy khi có sự kiện mở (opened), cập nhật (synchronize), hoặc mở lại (reopened) Pull Request vào nhánh chính `main`, cũng như khi có commit push trực tiếp vào `main`.
2. **Quy trình 4 giai đoạn chuẩn (Standard Pipeline Stages):** Mỗi ứng dụng phải đi qua đầy đủ chuỗi kiểm tra:
   $$\text{Install} \longrightarrow \text{Lint} \longrightarrow \text{Unit Test} \longrightarrow \text{Build}$$
3. **Bao phủ đa ứng dụng (Multi-app Coverage):** Kiểm tra độc lập và đồng thời cả hai phân hệ: Backend API (`apps/api`) và Frontend Web (`apps/web`).
4. **Cơ chế ngắt lỗi (Fail-Fast & Step Halting):** Khi bất kỳ một bước nào trong chuỗi gặp lỗi (non-zero exit code), bước đó phải đánh dấu thất bại ngay lập tức, các bước tiếp theo trong job phải bị hủy bỏ (skipped), và toàn bộ job đó phải mang trạng thái **FAILED**.
5. **Chính sách bảo vệ nhánh bắt buộc (Required Status Checks Enforcement):** Nhánh chính `main` phải được bảo vệ bởi quy tắc không cho phép hợp nhất (merge) bất kỳ Pull Request nào nếu các bài kiểm tra chất lượng (Status Checks) chưa đạt trạng thái **SUCCESS**.
6. **Chống vượt quyền (Enforce Admins):** Không cho phép bất kỳ thành viên nào, bao gồm cả Administrator / Repository Owner, bypass các kiểm tra bắt buộc này mà không có kiểm chứng CI.

---

## C. Cấu Hình CI Hiện Tại (`.github/workflows/quality.yml`)

Pipeline CI được cấu hình tập trung tại tệp `.github/workflows/quality.yml` với nội dung:

```yaml
name: Quality gates
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  quality:
    name: ${{ matrix.app }} lint, test, build
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        app: [api, web]
    defaults:
      run:
        working-directory: apps/${{ matrix.app }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: apps/${{ matrix.app }}/package-lock.json
      - name: Install
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Unit Test
        run: npm test
      - name: Build
        run: npm run build
```

### Phân Tích Cấu Hình Kỹ Thuật:
1. **Ma trận thực thi (Execution Matrix):** Định nghĩa `matrix.app: [api, web]`, sinh ra 2 jobs chạy song song:
   - `api lint, test, build`
   - `web lint, test, build`
2. **Quản lý Cache & Dependencies:** Sử dụng `npm ci` kết hợp bộ nhớ đệm tự động `actions/setup-node@v4` dựa trên `package-lock.json` của từng ứng dụng, tối ưu hóa tốc độ đóng gói và loại bỏ nguy cơ lệch thư viện.
3. **Lệnh thực thi tương ứng trong `package.json`:**
   - **`apps/api`:**
     - Lint: `npm run lint` $\rightarrow$ `oxlint --type-aware src/ test/` (siêu tốc, kiểm tra cú pháp và kiểu dữ liệu).
     - Test: `npm test` $\rightarrow$ `jest` (14 unit & e2e tests bao phủ toàn bộ controller, service, DTO và Supertest API).
     - Build: `npm run build` $\rightarrow$ `nest build` (biên dịch TypeScript sang mã JavaScript sẵn sàng triển khai).
   - **`apps/web`:**
     - Lint: `npm run lint` $\rightarrow$ `eslint` (Next.js ESLint configuration).
     - Test: `npm test` $\rightarrow$ `node --test tests/*.test.mjs && jest` (11 automated flow/race condition tests + 1 React Testing Library component suite).
     - Build: `npm run build` $\rightarrow$ `next build` (Next.js Turbopack tối ưu hóa SSR và xuất 5/5 static routes).

---

## D. Kiểm Tra và Thiết Lập Branch Protection / Rulesets Trên Nhánh `main`

### 1. Hiện trạng trước khi kiểm toán
Trước Task 4.4, nhánh `main` đã được bảo vệ một số tiêu chí cơ bản nhưng **chưa kích hoạt Required Status Checks** (ghi nhận tại `docs/github-setup.md` dòng 11: *"Chưa yêu cầu status check vì chưa có ứng dụng/CI để tạo check thực tế"*).

### 2. Hành động cấu hình bổ sung
Thông qua quyền quản trị GitHub CLI (`gh api`), đội ngũ DevOps đã cập nhật trực tiếp cấu hình bảo vệ nhánh `main` (`PUT /repos/vohuunghiaah/brewlite/branches/main/protection`):

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "api lint, test, build",
      "web lint, test, build"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_conversation_resolution": true
}
```

### 3. Đối soát xác minh cấu hình bảo vệ (Verification Output):
Truy vấn lại cấu hình trực tiếp từ GitHub REST API (`gh api repos/vohuunghiaah/brewlite/branches/main/protection/required_status_checks`):

```json
{
  "url": "https://api.github.com/repos/vohuunghiaah/brewlite/branches/main/protection/required_status_checks",
  "strict": true,
  "contexts": [
    "api lint, test, build",
    "web lint, test, build"
  ],
  "contexts_url": "https://api.github.com/repos/vohuunghiaah/brewlite/branches/main/protection/required_status_checks/contexts",
  "checks": [
    {
      "context": "api lint, test, build",
      "app_id": 15368
    },
    {
      "context": "web lint, test, build",
      "app_id": 15368
    }
  ]
}
```

- **Bắt buộc Pull Request:** ĐÃ BẬT (`required_pull_request_reviews`).
- **Yêu cầu Status Checks:** ĐÃ BẬT (`strict: true` — bắt buộc nhánh PR phải được cập nhật mới nhất với `main`).
- **Danh sách Checks bắt buộc:** Cả 2 jobs `api lint, test, build` và `web lint, test, build` (`app_id: 15368` - GitHub Actions).
- **Áp dụng với Admin:** ĐÃ BẬT (`enforce_admins: true` — không ai có thể bypass).
- **Chặn Force Push:** ĐÃ BẬT (`allow_force_pushes: false`).
- **Chặn xóa nhánh:** ĐÃ BẬT (`allow_deletions: false`).
- **Yêu cầu giải quyết thảo luận:** ĐÃ BẬT (`required_conversation_resolution: true`).

---

## E. Minh Chứng Workflow SUCCESS

### 1. Bằng chứng chạy trên nhánh `main` (Merge commit PR #27)
- **Workflow Run ID:** `44348896421`
- **URL:** [https://github.com/vohuunghiaah/brewlite/actions/runs/44348896421](https://github.com/vohuunghiaah/brewlite/actions/runs/44348896421)
- **Sự kiện kích hoạt:** `push` vào nhánh `main`
- **Commit SHA:** `755030860e5c4ac728dce7ee9185fcff5bb65a09`
- **Thời gian chạy:** 2026-11-18 16:35:00 UTC (Tổng thời gian: 1m36s)
- **Chi tiết thực thi từng Job:**
  - **Job `api lint, test, build` (ID `134958762636`, thời gian: 25s):**
    - Install (`npm ci`): **PASS** (0 errors)
    - Lint (`npm run lint`): **PASS** (Oxlint 0 errors)
    - Unit Test (`npm test`): **PASS** (14/14 tests qua 4 suites Jest)
    - Build (`npm run build`): **PASS** (NestJS compiled cleanly)
  - **Job `web lint, test, build` (ID `134958762404`, thời gian: 1m32s):**
    - Install (`npm ci`): **PASS** (0 errors)
    - Lint (`npm run lint`): **PASS** (Next.js ESLint 0 errors, 0 warnings)
    - Unit Test (`npm test`): **PASS** (12/12 tests: 11 node:test + 1 Jest RTL)
    - Build (`npm run build`): **PASS** (Turbopack static generation 5/5 pages)
- **Kết luận:** **SUCCESS (PASS 100%)**

### 2. Bằng chứng chạy trên Pull Request (Commit HEAD PR #27)
- **Workflow Run ID:** `44346653629`
- **URL:** [https://github.com/vohuunghiaah/brewlite/actions/runs/44346653629](https://github.com/vohuunghiaah/brewlite/actions/runs/44346653629)
- **Sự kiện:** `pull_request` (`feat/task4-3-menu-mvp`)
- **Commit SHA:** `05c9dd31d45d654c6a992a76f2d22a57375a0344`
- **Kết quả:** `api lint, test, build` (27s) **PASS**, `web lint, test, build` (39s) **PASS**.

---

## F. Minh Chứng Workflow FAILURE (Kiểm Thử Âm Có Kiểm Soát — Controlled Negative Test)

Để kiểm chứng năng lực thực tế của hệ thống CI trong việc phát hiện mã lỗi và ngăn chặn rủi ro đưa mã lỗi vào production, một thử nghiệm âm có chủ đích đã được tiến hành trên nhánh `ci/task4-4-final-acceptance`.

### 1. Kịch bản kiểm thử âm
- Tạo tệp kiểm thử có chủ đích thất bại: `apps/web/tests/ci-negative-check.test.mjs`:
  ```javascript
  import test from "node:test";
  import assert from "node:assert/strict";

  test("deliberate negative test for CI verification", () => {
    assert.strictEqual(1, 2, "Deliberate test failure for Task 4.4 CI verification");
  });
  ```
- Do cấu hình `npm test` trong `apps/web/package.json` quét toàn bộ `tests/*.test.mjs`, bài kiểm thử này được runner thực thi trực tiếp.
- Đẩy commit `f7548ec59a72ad96d5fa6c04f9826a7987823f66` lên nhánh và mở Pull Request [#28](https://github.com/vohuunghiaah/brewlite/pull/28).

### 2. Kết quả thực thi CI Run #44350188760
- **Workflow Run ID:** `44350188760`
- **URL:** [https://github.com/vohuunghiaah/brewlite/actions/runs/44350188760](https://github.com/vohuunghiaah/brewlite/actions/runs/44350188760)
- **Sự kiện kích hoạt:** `pull_request` (PR #28)
- **Commit SHA:** `f7548ec59a72ad96d5fa6c04f9826a7987823f66`
- **Thời điểm:** 2026-11-18 16:41:40 UTC
- **Trạng thái chung:** **FAILURE** (X)

### 3. Chi tiết trích xuất Log thất bại
```text
JOBS
X web lint, test, build in 21s (ID 134963378605)
  ✓ Set up job
  ✓ Run actions/checkout@v4
  ✓ Run actions/setup-node@v4
  ✓ Install
  ✓ Lint
  X Unit Test (exit code 1)
  - Build (SKIPPED)
  - Post Run actions/setup-node@v4
  ✓ Post Run actions/checkout@v4
  ✓ Complete job
✓ api lint, test, build in 31s (ID 134963379274)

--- TRÍCH XUẤT LOG RUNNER (Job ID 134963378605) ---
> web-temp@0.1.0 test
> node --test tests/*.test.mjs && jest

✖ deliberate negative test for CI verification (1.542573ms)
  AssertionError [ERR_ASSERTION]: Deliberate test failure for Task 4.4 CI verification
  1 !== 2
      at TestContext.<anonymous> (/home/runner/work/brewlite/brewlite/apps/web/tests/ci-negative-check.test.mjs:5:10)
ℹ tests 12
ℹ pass 11
ℹ fail 1
##[error]Process completed with exit code 1.
```

### 4. Bằng chứng Branch Protection Chặn Hợp Nhất (Merge Blocked Evidence)
Khi job `web lint, test, build` thất bại, GitHub tự động chuyển trạng thái kiểm tra của PR #28 sang thất bại:
```text
$ gh pr checks 28
web lint, test, build    fail    21s    https://github.com/vohuunghiaah/brewlite/actions/runs/44350188760/job/134963378605
api lint, test, build    pass    31s    https://github.com/vohuunghiaah/brewlite/actions/runs/44350188760/job/134963379274
```

Đồng thời, đối soát thuộc tính PR thông qua GitHub API (`gh api repos/vohuunghiaah/brewlite/pulls/28`):
```json
{
  "mergeable": true,
  "mergeable_state": "blocked"
}
```
> **Bằng chứng xác thực:** Mặc dù không có xung đột mã nguồn (`mergeable: true`), Pull Request #28 đã bị khóa chặt chẽ ở trạng thái **`blocked`** do vi phạm Required Status Checks. Không ai có thể nhấn Merge khi bài kiểm thử chưa vượt qua.

---

## G. Phân Tích Nguyên Nhân Thất Bại Của Pipeline Âm

1. **Vị trí phát sinh:** Bài kiểm thử `apps/web/tests/ci-negative-check.test.mjs` chứa câu lệnh khẳng định sai `assert.strictEqual(1, 2)`.
2. **Cơ chế lan truyền lỗi:**
   - Node.js test runner phát hiện assert sai, ném ra lỗi `ERR_ASSERTION` và trả về mã thoát `exit code 1`.
   - Lệnh `npm test` nhận mã thoát khác 0, lập tức làm dừng step `Unit Test`.
   - GitHub Actions kích hoạt cơ chế an toàn: **hủy bỏ hoàn toàn bước `Build` kế tiếp** để ngăn chặn việc đóng gói một bản build chứa mã lỗi.
   - Job `web lint, test, build` được đánh dấu là `failure`.
   - GitHub Status Check báo cáo kết quả về PR #28, kích hoạt quy tắc Branch Protection khóa nút merge.

---

## H. Minh Chứng Khắc Phục Và Chạy Lại SUCCESS

### 1. Hành động dọn dẹp và khắc phục
- Xóa bỏ hoàn toàn tệp kiểm thử âm: `git rm apps/web/tests/ci-negative-check.test.mjs`.
- Kiểm tra lại toàn bộ kiểm thử nội bộ: `npm --prefix apps/web test` đạt **11/11 tests pass (node:test) + 1/1 suite pass (Jest RTL)**.
- So sánh `git diff origin/main` để bảo đảm không còn bất kỳ dòng mã lỗi nào sót lại trong repository.
- Commit bản dọn dẹp và tài liệu nghiệm thu với thông điệp:
  `docs(ci): complete task 4.4 ci verification and clean negative test` (Commit `40f0e1c26b528b1a8d052d9a34bc444d371d7db3`).
- Đẩy commit lên nhánh `ci/task4-4-final-acceptance`.

### 2. Kết quả thực thi CI Run #44351533965 sau khắc phục
- **Workflow Run ID:** `44351533965`
- **URL:** [https://github.com/vohuunghiaah/brewlite/actions/runs/44351533965](https://github.com/vohuunghiaah/brewlite/actions/runs/44351533965)
- **Sự kiện kích hoạt:** `pull_request` (PR #28 update)
- **Commit SHA:** `40f0e1c26b528b1a8d052d9a34bc444d371d7db3`
- **Thời gian chạy:** 2026-11-18 16:49:00 UTC
- **Chi tiết kết quả từng job:**
  - **`api lint, test, build` (ID `134968192835`, 36s):** **PASS**
    - Install (`npm ci`): PASS
    - Lint (`npm run lint`): PASS
    - Unit Test (`npm test`): PASS (14/14 tests)
    - Build (`npm run build`): PASS
  - **`web lint, test, build` (ID `134968192122`, 42s):** **PASS**
    - Install (`npm ci`): PASS
    - Lint (`npm run lint`): PASS
    - Unit Test (`npm test`): PASS (12/12 tests)
    - Build (`npm run build`): PASS (5/5 pages static prerender)

### 3. Đối soát trạng thái Pull Request sau khắc phục
- Truy vấn kết quả checks của PR #28:
  ```text
  $ gh pr checks 28
  api lint, test, build    pass    36s    https://github.com/vohuunghiaah/brewlite/actions/runs/44351533965/job/134968192835
  web lint, test, build    pass    42s    https://github.com/vohuunghiaah/brewlite/actions/runs/44351533965/job/134968192122
  ```
- Đối soát thuộc tính mergeable qua GitHub API:
  ```json
  {
    "mergeable": true,
    "mergeable_state": "clean"
  }
  ```
> **Kết luận chuyển đổi trạng thái:** Trạng thái của Pull Request #28 đã chuyển đổi thành công và chính xác từ **`blocked`** sang **`clean`**. Điều này khẳng định 100% tính năng kiểm soát chất lượng qua CI và Branch Protection hoạt động chính xác theo đặc tả.

---

## I. Đối Chiếu Tiêu Chí Nghiệm Thu (Acceptance Criteria Mapping)

| STT | Tiêu chí nghiệm thu Task 4.4 | Hiện trạng thực tế | Đánh giá |
|:---:|---|---|:---:|
| 1 | **Tự động chạy trên Pull Request** | Kích hoạt tự động ngay khi mở PR #28 và khi push commit mới. | **PASS** |
| 2 | **Đầy đủ 4 bước chuẩn** | Thực thi tuần tự `Install -> Lint -> Unit Test -> Build` trên cả 2 jobs. | **PASS** |
| 3 | **Bao phủ cả Backend và Frontend** | Matrix song song `api lint, test, build` và `web lint, test, build`. | **PASS** |
| 4 | **Ngắt tiến trình khi có bước lỗi** | Khi step `Unit Test` lỗi, step `Build` bị skip ngay lập tức, job trả về FAIL. | **PASS** |
| 5 | **Required Status Checks trên `main`** | Đã cấu hình `main` yêu cầu cả 2 jobs phải PASS mới cho phép merge. | **PASS** |
| 6 | **Enforce Admins & Chống Bypass** | `enforce_admins=true`, chặn force push, chặn xóa nhánh. | **PASS** |
| 7 | **Minh chứng FAILURE thực tế** | Run #44350188760: Job Web FAIL tại Unit Test, PR mergeable state = `blocked`. | **PASS** |
| 8 | **Minh chứng SUCCESS thực tế** | Run #44348896421 (main push) & Run #44346653629 (PR) đạt 100% SUCCESS. | **PASS** |
| 9 | **Dọn dẹp mã thử nghiệm âm** | Tệp `ci-negative-check.test.mjs` đã bị xóa hoàn toàn khỏi repository. | **PASS** |
| 10 | **Hồ sơ tài liệu minh bạch** | Biên bản nghiệm thu `DOC-CI-01` ghi nhận đầy đủ logs, links, commit SHAs. | **PASS** |

---

## J. Kết Luận Nghiệm Thu

Hệ thống Continuous Integration của dự án BrewLite (Assignment 2) đáp ứng đầy đủ, chính xác và trung thực 100% các tiêu chí kỹ thuật quy định tại mục 6.4 của Assignment 2.

**KẾT LUẬN CUỐI CÙNG:** **TASK 4.4 — CONTINUOUS INTEGRATION: FINAL PASS**
