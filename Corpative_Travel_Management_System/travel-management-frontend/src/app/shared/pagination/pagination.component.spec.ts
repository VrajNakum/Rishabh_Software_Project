import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    component.totalItems = 25;
    component.pageSize = 10;
    component.currentPage = 1;
    fixture.detectChanges();
  });

  it('should create pagination component', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate total pages and entry range accurately', () => {
    expect(component.totalPages).toBe(3);
    expect(component.startEntry).toBe(1);
    expect(component.endEntry).toBe(10);

    // Switch to page 2
    component.currentPage = 2;
    expect(component.startEntry).toBe(11);
    expect(component.endEntry).toBe(20);

    // Switch to page 3 (last page of 25)
    component.currentPage = 3;
    expect(component.startEntry).toBe(21);
    expect(component.endEntry).toBe(25);
  });

  it('should emit pageChange when navigating to next page', () => {
    const pageSpy = vi.spyOn(component.pageChange, 'emit');

    component.onPageChange(2);
    expect(pageSpy).toHaveBeenCalledWith(2);

    // Should not emit if page is outside valid range
    pageSpy.mockClear();
    component.onPageChange(0);
    expect(pageSpy).not.toHaveBeenCalled();

    component.onPageChange(4);
    expect(pageSpy).not.toHaveBeenCalled();
  });

  it('should emit pageSizeChange when changing page size', () => {
    const sizeSpy = vi.spyOn(component.pageSizeChange, 'emit');
    const mockEvent = { target: { value: '20' } } as unknown as Event;

    component.onPageSizeChange(mockEvent);
    expect(sizeSpy).toHaveBeenCalledWith(20);
  });
});
