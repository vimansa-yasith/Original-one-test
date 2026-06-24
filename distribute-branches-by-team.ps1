# Copies files into the 4-team branch structure:
#   dev/feature/backend-core   (auth, jobs, payments, attendance)
#   dev/feature/frontend       (all React pages, components)
#   dev/feature/services       (notifications, WhatsApp, admin)
#   dev/feature/config-docs    (tests, config, README, Swagger)
# under C:\Users\infos\Documents\Projects\dev\feature\<name>, preserving relative
# paths. Source files are untouched (copy, not move).

$root = "C:\Users\infos\Documents\Projects\DEA-01"
$destRoot = "C:\Users\infos\Documents\Projects\dev\feature"
$pkg = "src\main\java\com\flexiwork"

function P($rel) { Join-Path $pkg $rel }

$teams = @{
  "backend-core" = @(
    # auth
    (P "controller\AuthController.java"), (P "controller\RegistrationController.java"),
    (P "service\AuthService.java"), (P "service\RegistrationService.java"),
    (P "service\OtpService.java"), (P "service\LoginAttemptService.java"),
    (P "security\JwtService.java"), (P "security\JwtAuthFilter.java"),
    (P "security\AppUserDetailsService.java"), (P "security\AppUserPrincipal.java"),
    (P "security\CurrentUserService.java"), (P "security\RestAuthEntryPoint.java"),
    (P "config\SecurityConfig.java"),
    (P "entity\OtpToken.java"), (P "entity\User.java"),
    (P "dto\auth\LoginRequest.java"), (P "dto\auth\AuthResponse.java"), (P "dto\auth\CurrentUserResponse.java"),
    (P "dto\account\ChangeEmailRequest.java"), (P "dto\account\ChangeWhatsappRequest.java"),
    (P "dto\account\ForgotPasswordRequest.java"), (P "dto\account\ResetPasswordRequest.java"),
    (P "dto\account\VerifyOtpRequest.java"),
    (P "dto\registration\WorkerRegistrationRequest.java"), (P "dto\registration\CompanyRegistrationRequest.java"),
    (P "dto\registration\RegistrationResponse.java"),
    (P "util\PhoneUtil.java"),
    # jobs
    (P "controller\JobController.java"), (P "controller\ApplicationController.java"),
    (P "service\JobService.java"), (P "service\JobMapper.java"), (P "service\ApplicationService.java"),
    (P "entity\JobPost.java"), (P "entity\Application.java"),
    (P "entity\enums\JobCategory.java"), (P "entity\enums\JobStatus.java"), (P "entity\enums\ApplicationStatus.java"),
    (P "repository\JobPostRepository.java"), (P "repository\JobPostSpecifications.java"),
    (P "repository\ApplicationRepository.java"),
    (P "dto\job\JobRequest.java"), (P "dto\job\JobResponse.java"), (P "dto\job\JobFeedQuery.java"),
    (P "dto\job\ExtendShiftRequest.java"),
    (P "dto\application\ApplyRequest.java"), (P "dto\application\ApplicationResponse.java"),
    (P "dto\application\ApplicantResponse.java"),
    # payments
    (P "controller\PaymentController.java"),
    (P "service\PaymentService.java"), (P "service\PdfReceiptService.java"),
    (P "service\payment\PaymentGateway.java"), (P "service\payment\SimulatedPaymentGateway.java"),
    (P "entity\Payment.java"), (P "entity\enums\PaymentStatus.java"),
    (P "repository\PaymentRepository.java"), (P "repository\LedgerSpecifications.java"),
    (P "dto\payment\PayRequest.java"), (P "dto\payment\PaymentResponse.java"), (P "dto\payment\PaymentSummary.java"),
    # attendance + worker/company profile
    (P "controller\AttendanceController.java"), (P "controller\CompanyDashboardController.java"),
    (P "controller\StaffController.java"), (P "controller\WorkerProfileController.java"),
    (P "controller\WorkerDashboardController.java"), (P "controller\WorkerAccountController.java"),
    (P "controller\WorkerSettingsController.java"),
    (P "service\AttendanceService.java"), (P "service\StaffService.java"), (P "service\WorkerProfileService.java"),
    (P "entity\Attendance.java"), (P "entity\ShiftExtension.java"), (P "entity\WorkerProfile.java"), (P "entity\CompanyProfile.java"),
    (P "dto\attendance\ScanRequest.java"), (P "dto\attendance\ScanResponse.java"),
    (P "dto\attendance\PreviewResponse.java"), (P "dto\attendance\JobWorkerRow.java"),
    (P "dto\attendance\TodayJobSummary.java"),
    # shared/core deps for the above (entities, repos, enums, dtos this domain needs to compile)
    (P "controller\ReferenceController.java"),
    (P "dto\PageResponse.java"),
    (P "dto\staff\CreateStaffRequest.java"), (P "dto\staff\StaffResponse.java"),
    (P "dto\worker\WorkerProfileResponse.java"), (P "dto\worker\WorkerProfileUpdateRequest.java"),
    (P "entity\enums\District.java"), (P "entity\enums\OtpPurpose.java"),
    (P "entity\enums\Role.java"), (P "entity\enums\VerificationStatus.java"),
    (P "repository\AttendanceRepository.java"), (P "repository\CompanyProfileRepository.java"),
    (P "repository\OtpTokenRepository.java"), (P "repository\ShiftExtensionRepository.java"),
    (P "repository\UserRepository.java"), (P "repository\WorkerProfileRepository.java"),
    (P "service\AccountService.java")
  )
  "frontend" = @(
    "frontend\package.json", "frontend\package-lock.json", "frontend\vite.config.js",
    "frontend\index.html", "frontend\Dockerfile", "frontend\nginx.conf.template",
    "frontend\src\App.jsx", "frontend\src\main.jsx",
    "frontend\src\auth.jsx", "frontend\src\api.js", "frontend\src\validation.js", "frontend\src\geocode.js",
    "frontend\src\auth.css", "frontend\src\home.css", "frontend\src\styles.css",
    "frontend\src\components\Navbar.jsx", "frontend\src\components\ProtectedRoute.jsx",
    "frontend\src\components\ConfirmDialog.jsx", "frontend\src\components\MapPicker.jsx", "frontend\src\components\JobCard.jsx",
    "frontend\src\pages\Login.jsx", "frontend\src\pages\WorkerRegister.jsx", "frontend\src\pages\CompanyRegister.jsx",
    "frontend\src\pages\ForgotPassword.jsx", "frontend\src\pages\About.jsx", "frontend\src\pages\HowItWorks.jsx",
    "frontend\src\pages\Contact.jsx", "frontend\src\pages\RoleChoice.jsx", "frontend\src\pages\JobFeed.jsx",
    "frontend\src\pages\JobDetail.jsx",
    "frontend\src\pages\worker\WorkerProfile.jsx", "frontend\src\pages\worker\WorkerDashboard.jsx",
    "frontend\src\pages\worker\AccountSettings.jsx",
    "frontend\src\pages\company\CompanyDashboard.jsx", "frontend\src\pages\company\Staff.jsx",
    "frontend\src\pages\company\PostJob.jsx", "frontend\src\pages\company\MyJobs.jsx",
    "frontend\src\pages\company\JobApplicants.jsx", "frontend\src\pages\company\Payments.jsx",
    "frontend\src\pages\company\PayPage.jsx",
    "frontend\src\pages\guard\GuardKiosk.jsx"
  )
  "services" = @(
    (P "service\NotificationService.java"), (P "service\NotificationTriggers.java"),
    (P "service\EmailService.java"), (P "service\WhatsAppClient.java"), (P "service\WhatsAppNotificationService.java"),
    (P "admin\AdminController.java"),
    (P "controller\AdminFileController.java"), (P "controller\FileController.java"), (P "controller\ContactController.java"),
    (P "service\AdminService.java"), (P "service\SettingsService.java"),
    (P "service\FileStorageService.java"), (P "service\QrService.java"), (P "service\ContactService.java"),
    (P "entity\SystemSettings.java"), (P "entity\ContactMessage.java"),
    (P "repository\SystemSettingsRepository.java"),
    (P "dto\contact\ContactRequest.java"),
    "whatsapp-service\index.js", "whatsapp-service\package.json", "whatsapp-service\package-lock.json",
    "whatsapp-service\Dockerfile", "whatsapp-service\.npmrc",
    (P "repository\ContactMessageRepository.java")
  )
  "config-docs" = @(
    "pom.xml", "README.md", "Dockerfile", ".dockerignore", ".gitignore", "flexiwork_branch_plan.pdf",
    "deploy", "database",
    (P "FlexiWorkApplication.java"),
    (P "config\OpenApiConfig.java"), (P "config\DataSeeder.java"), (P "config\ScheduledTasks.java"), (P "config\AuditorAwareImpl.java"),
    (P "exception\GlobalExceptionHandler.java"), (P "exception\ResourceNotFoundException.java"),
    (P "exception\ApiError.java"), (P "exception\BusinessException.java"),
    (P "controller\ErrorPageController.java"),
    (P "entity\Auditable.java"),
    (P "util\GeoUtil.java"), (P "util\AppClock.java"),
    "src\test"
  )
}

$sharedNotes = @{
  "backend-core" = @("entity\User.java (shared with every backend domain - coordinate before editing)", "config\SecurityConfig.java (touches auth for the whole app - coordinate before editing)")
  "frontend"     = @("frontend\src\api.js", "frontend\src\validation.js") | ForEach-Object { "$_ (shared by every page - coordinate before editing)" }
  "config-docs"  = @((P "FlexiWorkApplication.java") + " (main app entrypoint - everyone depends on it building)")
}

$missing = @()
$copiedCount = 0

foreach ($team in $teams.Keys) {
  $destDir = Join-Path $destRoot $team
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null

  $notes = @("Files for branch: feature/$team", "Place these back at the same relative path in your project clone.", "")
  foreach ($rel in $teams[$team]) {
    $src = Join-Path $root $rel
    if (Test-Path $src) {
      $dst = Join-Path $destDir $rel
      if ((Get-Item $src) -is [System.IO.DirectoryInfo]) {
        New-Item -ItemType Directory -Force -Path $dst | Out-Null
        Copy-Item -Path (Join-Path $src "*") -Destination $dst -Recurse -Force
      } else {
        New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
        Copy-Item -Path $src -Destination $dst -Force
      }
      $copiedCount++
      $notes += $rel
    } else {
      $missing += "$team -> $rel"
    }
  }
  if ($sharedNotes.ContainsKey($team)) {
    $notes += ""
    $notes += "SHARED FILES (ask before editing):"
    $notes += $sharedNotes[$team]
  }
  $notes -join "`r`n" | Set-Content -Path (Join-Path $destDir "README.txt") -Encoding UTF8
}

Write-Host "Copied $copiedCount items across $($teams.Keys.Count) team folders under $destRoot."
if ($missing.Count -gt 0) {
  Write-Host "`nMISSING SOURCE FILES/FOLDERS (not found in project, skipped):"
  $missing | ForEach-Object { Write-Host "  - $_" }
} else {
  Write-Host "No missing files."
}
