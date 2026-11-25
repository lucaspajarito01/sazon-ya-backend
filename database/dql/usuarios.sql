-- =============================================================================
-- PROYECTO: SazónYA (sazon-ya-backend)
-- ARCHIVO: database/dql/usuarios.sql
-- DESCRIPCIÓN: Segmentación de usuarios DCL bajo principio de mínimo privilegio
-- =============================================================================

USE sazon_ya;

-- Usuario de aplicación backend (sin permisos DROP ni GRANT)
CREATE USER IF NOT EXISTS 'sazon_app'@'%' IDENTIFIED BY 'SazonYa_App_2026!';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON sazon_ya.* TO 'sazon_app'@'%';

-- Usuario de solo lectura para analítica y reportes semanales
CREATE USER IF NOT EXISTS 'sazon_reportes'@'%' IDENTIFIED BY 'SazonYa_Reportes_2026!';
GRANT SELECT ON sazon_ya.vw_estadisticas_ventas_semanales TO 'sazon_reportes'@'%';
GRANT SELECT ON sazon_ya.vw_alertas_inventario TO 'sazon_reportes'@'%';

FLUSH PRIVILEGES;

-- ===== PRUEBA =====
-- SHOW GRANTS FOR 'sazon_app'@'%';
-- SHOW GRANTS FOR 'sazon_reportes'@'%';
