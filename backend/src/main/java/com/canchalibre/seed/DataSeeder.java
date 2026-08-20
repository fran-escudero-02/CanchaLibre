package com.canchalibre.seed;

import com.canchalibre.complex.SportsComplex;
import com.canchalibre.complex.SportsComplexRepository;
import com.canchalibre.court.Court;
import com.canchalibre.court.CourtRepository;
import com.canchalibre.court.Sport;
import com.canchalibre.court.Surface;
import com.canchalibre.user.Role;
import com.canchalibre.user.User;
import com.canchalibre.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seed(UserRepository users, SportsComplexRepository complexes,
                           CourtRepository courts, PasswordEncoder encoder) {
        return args -> {
            if (users.count() > 0) return;

            user(users, encoder, "Super Admin", "super@canchalibre.dev", "super1234", Role.ROLE_SUPERADMIN);
            User owner = user(users, encoder, "Dueno Club", "admin@canchalibre.dev", "admin1234", Role.ROLE_ADMIN_COMPLEX);
            user(users, encoder, "Jugador Demo", "player@canchalibre.dev", "player1234", Role.ROLE_PLAYER);

            SportsComplex complex = new SportsComplex();
            complex.setName("Club CanchaLibre");
            complex.setAddress("Av. Siempreviva 742");
            complex.setPhone("1122334455");
            complex.setOpenTime(LocalTime.of(8, 0));
            complex.setCloseTime(LocalTime.of(23, 0));
            complex.setSlotDurationMinutes(60);
            complex.setOwner(owner);
            complexes.save(complex);

            courts.saveAll(List.of(
                    court(complex, "Cancha 1", Sport.FUTBOL_5, Surface.CESPED_SINTETICO, false, "15000", 30),
                    court(complex, "Cancha 2", Sport.PADEL, Surface.CEMENTO, true, "18000", 40),
                    court(complex, "Cancha 3", Sport.TENIS, Surface.POLVO_LADRILLO, false, "12000", 30)));
        };
    }

    private User user(UserRepository repo, PasswordEncoder encoder, String name, String email,
                      String password, Role role) {
        User u = new User();
        u.setFullName(name);
        u.setEmail(email);
        u.setPhone("1100000000");
        u.setPasswordHash(encoder.encode(password));
        u.setRole(role);
        return repo.save(u);
    }

    private Court court(SportsComplex complex, String name, Sport sport, Surface surface,
                        boolean indoor, String price, int depositPct) {
        Court c = new Court();
        c.setComplex(complex);
        c.setName(name);
        c.setSport(sport);
        c.setSurface(surface);
        c.setIsIndoor(indoor);
        c.setPrice(new BigDecimal(price));
        c.setDepositPercentage(depositPct);
        return c;
    }
}
