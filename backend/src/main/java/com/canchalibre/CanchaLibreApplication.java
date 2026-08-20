package com.canchalibre;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CanchaLibreApplication {
    public static void main(String[] args) {
        SpringApplication.run(CanchaLibreApplication.class, args);
    }
}
