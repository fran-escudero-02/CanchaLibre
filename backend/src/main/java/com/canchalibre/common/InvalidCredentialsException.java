package com.canchalibre.common;

import org.springframework.security.core.AuthenticationException;

/**
 * Credenciales invalidas en login. Se mapea a 401 sin revelar que campo fallo (HU-01).
 */
public class InvalidCredentialsException extends AuthenticationException {
    public InvalidCredentialsException() {
        super("Credenciales invalidas");
    }
}
