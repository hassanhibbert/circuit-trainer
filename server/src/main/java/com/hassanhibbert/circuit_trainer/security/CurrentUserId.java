package com.hassanhibbert.circuit_trainer.security;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A meta-annotation: putting @CurrentUserId on a controller parameter is the same as writing
 * the @AuthenticationPrincipal below. After the JWT filter authenticates a request, the
 * principal is the decoded Jwt; the SpEL expression reads its "sub" claim (the user id).
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@AuthenticationPrincipal(expression = "T(java.lang.Long).valueOf(subject)")
public @interface CurrentUserId {
}
