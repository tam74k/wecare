@echo off
chcp 65001 >nul
cd /d "%~dp0"
title WeCare - رفع التحديثات إلى GitHub

echo ===================================================
echo     WeCare - رفع التحديثات إلى GitHub
echo     GitHub Update and Push Tool
echo ===================================================
echo.

git --version >nul 2>&1
if errorlevel 1 goto NoGit

echo [1/3] جاري فحص الملفات والتعديلات...
echo ---------------------------------------------------
git status -s
echo ---------------------------------------------------
echo.

set "user_msg="
set /p user_msg="اكتب وصف التحديث [اضغط Enter للاعتماد التلقائي]: "

if "%user_msg%"=="" (
    set "msg=تحديثات عامة للنظام"
) else (
    set "msg=%user_msg%"
)

echo.
echo [2/3] جاري تجهيز وتسجيل الملفات (git add + commit)...
git add -A
git commit -m "%msg%"

echo.
echo [3/3] جاري الرفع إلى المستودع (git push origin main)...
git branch -M main 2>nul
git push -u origin main
if not errorlevel 1 goto Success

echo.
echo ===================================================
echo  [تنبيه] تعذر الرفع المباشر إلى GitHub.
echo ===================================================
echo.
echo الأسباب الشائعة:
echo 1. رابط SSH غير مصرح به على حسابك.
echo 2. وجود تحديثات على GitHub تحتاج إلى سحب أولاً.
echo.

set "choice="
set /p choice="هل تريد التبديل إلى رابط HTTPS والمحاولة مجدداً؟ (y/n): "
if /i "%choice%"=="y" goto TryHttps

set "pull_choice="
set /p pull_choice="هل تريد محاولة سحب التحديثات وإعادة الرفع؟ (y/n): "
if /i "%pull_choice%"=="y" goto TryPull

goto End

:TryHttps
echo.
echo جاري تحويل الرابط إلى HTTPS والمحاولة...
git remote set-url origin https://github.com/tam74k/wecare.git
git push -u origin main
if not errorlevel 1 goto Success
goto End

:TryPull
echo.
echo جاري سحب التحديثات من GitHub...
git pull --rebase origin main
echo إعادة محاولة الرفع...
git push -u origin main
if not errorlevel 1 goto Success
goto End

:Success
echo.
echo ===================================================
echo  [نجاح] تم رفع جميع التحديثات إلى GitHub بنجاح!
echo  [SUCCESS] All updates pushed to GitHub!
echo ===================================================
goto End

:NoGit
echo.
echo [خطأ] برنامج Git غير مثبت على جهازك أو غير مضاف لمتغيرات PATH.
echo يرجى تحميل وتثبيت Git من: https://git-scm.com/
goto End

:End
echo.
echo اضغط أي مفتاح للإغلاق...
pause >nul
