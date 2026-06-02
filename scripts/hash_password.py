"""Genera SHA-256 de una contraseña para pegar en index.html → CONFIG.PASSWORD_HASH."""
import hashlib
import getpass

pw = getpass.getpass("Contraseña (no se muestra): ")
print("\nSHA-256:", hashlib.sha256(pw.encode('utf-8')).hexdigest())
