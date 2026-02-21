#!/bin/bash

echo -e "\e[32m"
echo "====================================="
echo "      УСТАНОВКА HupGram USERBOT      "
echo "====================================="
echo -e "\e[0m"

# 1. Обновление пакетов и установка Python
echo "[1/4] Установка зависимостей (Python, Git, ffmpeg)..."
pkg update -y && pkg upgrade -y
pkg install python git ffmpeg build-essential libcrypt-dev libffi-dev -y

# 2. Клонирование твоего репозитория
echo "[2/4] Скачивание файлов HupGram..."
git clone https://github.com/ТВОЙ_НИК/HupGram.git
cd HupGram

# 3. Установка библиотек
echo "[3/4] Установка библиотек (Telethon, aiosqlite, и т.д.)..."
pip install -r requirements.txt

# 4. Сбор данных у пользователя
echo "[4/4] Настройка Конфигурации!"
read -p "Введи твой APP_ID (цифры с my.telegram.org): " api_id
read -p "Введи твой API_HASH (с my.telegram.org): " api_hash
read -p "Введи Токен Управляющего Бота (от @BotFather): " bot_token
read -p "Введи твой ID в Telegram (кому доступна админка): " admin_id

# 5. Генерация файла config.py
cat <<EOF > config.py
import os

BOT_API_ID = $api_id
BOT_API_HASH = "$api_hash"
BOT_TOKEN = "$bot_token"
ADMIN_ID = $admin_id

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FOLDER = os.path.join(BASE_DIR, 'database')
SESSIONS_FOLDER = os.path.join(BASE_DIR, 'sessions')
DB_PATH = os.path.join(DB_FOLDER, 'super_userbot.db')

os.makedirs(DB_FOLDER, exist_ok=True)
os.makedirs(SESSIONS_FOLDER, exist_ok=True)
EOF

echo -e "\e[32m✅ Установка успешно завершена!\e[0m"
echo -e "Для запуска напиши: \e[33mcd HupGram && python main.py\e[0m"
