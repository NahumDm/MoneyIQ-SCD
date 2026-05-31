@REM Maven Wrapper — run auth service without installing Maven globally
@REM Usage: mvnw.cmd spring-boot:run

@echo off
setlocal

set "MAVEN_PROJECTBASEDIR=%~dp0"
set "WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar"
set "WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain"

if not exist "%WRAPPER_JAR%" (
  echo Downloading Maven Wrapper...
  powershell -NoProfile -Command ^
    "$dir = '%MAVEN_PROJECTBASEDIR%.mvn\wrapper'; New-Item -ItemType Directory -Force -Path $dir | Out-Null; ^
     Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar' -OutFile '%WRAPPER_JAR%' -UseBasicParsing"
)

set "JAVA_EXE=java"
if defined JAVA_HOME set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"

"%JAVA_EXE%" -classpath "%WRAPPER_JAR%" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" %WRAPPER_LAUNCHER% %*
if ERRORLEVEL 1 exit /B %ERRORLEVEL%
endlocal
