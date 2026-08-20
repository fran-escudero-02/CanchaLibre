package com.canchalibre.slot;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record GridDTO(Long id, String nombre, String deporte, String superficie, Boolean techada,
                      BigDecimal precio, Integer porcentajeSena, List<SlotDTO> slots) {

    public record SlotDTO(Long id, Instant inicio, String estado) {}
}
