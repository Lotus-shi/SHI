@echo off
REM 生鲜商城 SpringBoot 后端启动脚本
REM 用法：双击运行（先停掉 Node 版 server 服务，端口同为 3000）
chcp 65001 >nul
set JAVA_HOME=C:\Users\SHI\devtools\jdk-21.0.12+8
set PATH=%JAVA_HOME%\bin;%PATH%

cd /d %~dp0
echo 正在启动 SpringBoot 后端...
if not exist target\fresh-mall-1.0.0.jar (
    echo 首次运行，正在打包...
    call C:\Users\SHI\devtools\apache-maven-3.9.9\bin\mvn package -DskipTests
)
java -jar target\fresh-mall-1.0.0.jar
pause
