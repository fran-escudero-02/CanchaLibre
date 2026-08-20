package com.canchalibre.slot;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/complexes/{complexId}/grid")
@RequiredArgsConstructor
public class SlotController {

    private final SlotService slotService;

    @GetMapping
    public List<GridDTO> grid(@PathVariable Long complexId, @RequestParam LocalDate date) {
        return slotService.getGrid(complexId, date);
    }
}
