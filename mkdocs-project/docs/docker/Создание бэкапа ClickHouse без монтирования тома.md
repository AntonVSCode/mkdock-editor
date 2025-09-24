---
tags:
  - docker
  - ClickHouse
  - backup
---

Если том (volume) не подключен (not mounted) к контейнеру ClickHouse, то `clickhouse-backup` **не сможет** создать резервную копию данных стандартным способом, так как ему требуется доступ к данным ClickHouse (каталоги `/var/lib/clickhouse/`).  

1. **Подключить volume временно**  
   Если данные хранятся на хосте, подключите volume при запуске контейнера:  
```bash
docker run -d \
 --name clickhouse-server \
 -v /path/to/clickhouse/data:/var/lib/clickhouse \
 -v /path/to/backups:/var/lib/clickhouse/backup \
 clickhouse/clickhouse-server
```
Затем создайте бэкап:  
```bash
docker exec -it clickhouse-server clickhouse-backup create backup_name
```

2. **Копировать данные вручную**  
   Если volume недоступен, скопируйте файлы данных напрямую из контейнера:  
```bash
docker cp clickhouse-server:/var/lib/clickhouse /path/to/backup
```
   *Примечание:* Это неструктурированная копия, восстановление может потребовать ручного вмешательства.

3. **Использовать `clickhouse-client` для дампа**  
   Создайте SQL-дамп через `clickhouse-client`:  
   
```bash
 docker exec -it clickhouse-server clickhouse-client \
   --query="SHOW DATABASES" | grep -v system | while read db; do
     echo "Backing up $db..."
     docker exec -it clickhouse-server clickhouse-client \
       --database="$db" \
       --query="SHOW TABLES" | while read table; do
         docker exec -it clickhouse-server clickhouse-client \
           --query="SELECT * FROM $db.$table FORMAT Native" > "$db_$table.bak"
     done
 done
```
   *Недостаток:* Медленно для больших данных.

## Варианты создания бекапа

### 1. **Установите `clickhouse-backup` внутри контейнера**  
Если у вас есть доступ к контейнеру с `bash` или `sh`, можно установить утилиту вручную:  

```bash
docker exec -it clickhouse_cmmfeed bash -c '
  curl -s https://clickhouse.com/ | sh && \
  chmod +x clickhouse-backup && \
  mv clickhouse-backup /usr/bin/
'
```

После этого попробуйте снова создать бэкап:  
```bash
docker exec -it clickhouse_cmmfeed clickhouse-backup create clickhouse_backup_ump_$(date +%Y-%m-%d)
```

---

### 2. **Используйте официальный образ с `clickhouse-backup`**  
Если возможно, пересоздайте контейнер, используя образ, где `clickhouse-backup` уже предустановлен:  

```bash
docker run -d \
  --name clickhouse_with_backup \
  -v /path/to/clickhouse/data:/var/lib/clickhouse \
  -v /path/to/backups:/var/lib/clickhouse/backup \
  altinity/clickhouse-server:latest  # или другой образ с поддержкой clickhouse-backup
```

---

### 3. **Создайте бэкап через `docker cp` (если данные важны прямо сейчас)**  
Если нужно срочно сохранить данные, скопируйте их вручную:  

```bash
docker cp clickhouse_cmmfeed:/var/lib/clickhouse ./clickhouse_backup_temp
tar -czvf clickhouse_backup_ump_$(date +%Y-%m-%d).tar.gz ./clickhouse_backup_temp
```

---

### 4. **Альтернатива: Дамп через `clickhouse-client`**  
Если `clickhouse-client` доступен, экспортируйте данные в SQL:  

```bash
docker exec -it clickhouse_cmmfeed clickhouse-client \
  --query="SHOW DATABASES" | grep -v -e system -e INFORMATION_SCHEMA | while read db; do
    echo "Backing up database: $db"
    docker exec -it clickhouse_cmmfeed clickhouse-client \
      --database="$db" \
      --query="SHOW TABLES" | while read table; do
        docker exec -it clickhouse_cmmfeed clickhouse-client \
          --query="SELECT * FROM $db.$table FORMAT CSV" > "${db}_${table}.csv"
    done
done
```

---

