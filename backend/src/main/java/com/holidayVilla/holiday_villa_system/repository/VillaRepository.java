package com.holidayVilla.holiday_villa_system.repository;

import com.holidayVilla.holiday_villa_system.entity.Villa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VillaRepository extends JpaRepository<Villa, Long> {

	List<Villa> findAllByIsDeletedFalse();

	Optional<Villa> findByIdAndIsDeletedFalse(Long id);
}
